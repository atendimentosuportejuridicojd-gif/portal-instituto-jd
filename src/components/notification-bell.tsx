import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { Bell, Check, CheckCheck, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import {
  listMinhasNotificacoes,
  marcarNotificacaoLida,
  marcarTodasNotificacoesLidas,
} from "@/lib/notificacoes.functions";

export function NotificationBell() {
  const listFn = useServerFn(listMinhasNotificacoes);
  const markFn = useServerFn(marcarNotificacaoLida);
  const markAllFn = useServerFn(marcarTodasNotificacoesLidas);
  const qc = useQueryClient();

  const q = useQuery({
    queryKey: ["notificacoes"],
    queryFn: () => listFn(),
    refetchInterval: 60_000,
  });
  const mark = useMutation({
    mutationFn: (id: string) => markFn({ data: { id } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notificacoes"] }),
  });
  const markAll = useMutation({
    mutationFn: () => markAllFn(),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notificacoes"] }),
  });

  const items = q.data ?? [];
  const naoLidas = items.filter((n) => !n.lida).length;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="Notificações" className="relative">
          <Bell className="h-4 w-4" />
          {naoLidas > 0 && (
            <span className="absolute right-1.5 top-1.5 grid h-4 min-w-4 place-items-center rounded-full bg-destructive px-1 text-[10px] font-semibold leading-none text-destructive-foreground">
              {naoLidas > 9 ? "9+" : naoLidas}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-96 p-0">
        <div className="flex items-center justify-between border-b border-border/60 px-4 py-3">
          <div>
            <p className="text-sm font-semibold">Notificações</p>
            <p className="text-xs text-muted-foreground">
              {naoLidas === 0 ? "Tudo em dia" : `${naoLidas} não lida${naoLidas > 1 ? "s" : ""}`}
            </p>
          </div>
          {naoLidas > 0 && (
            <Button variant="ghost" size="sm" onClick={() => markAll.mutate()}>
              <CheckCheck className="mr-1 h-3.5 w-3.5" />
              Marcar todas
            </Button>
          )}
        </div>
        <ScrollArea className="max-h-96">
          {items.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-muted-foreground">
              Você não tem notificações.
            </div>
          ) : (
            <ul className="divide-y divide-border/50">
              {items.map((n) => (
                <li
                  key={n.id}
                  className={cn(
                    "flex items-start gap-3 px-4 py-3 text-sm",
                    !n.lida && "bg-primary/5",
                  )}
                >
                  <div className="min-w-0 flex-1">
                    <p className="font-medium leading-tight">{n.titulo}</p>
                    {n.mensagem && (
                      <p className="mt-1 text-xs text-muted-foreground line-clamp-2">{n.mensagem}</p>
                    )}
                    <p className="mt-1 text-[11px] uppercase tracking-wider text-muted-foreground">
                      {new Date(n.publicada_em).toLocaleString("pt-BR")}
                    </p>
                  </div>
                  {!n.lida && (
                    <button
                      onClick={() => mark.mutate(n.id)}
                      className="shrink-0 rounded p-1 text-muted-foreground hover:text-foreground"
                      aria-label="Marcar como lida"
                    >
                      <Check className="h-3.5 w-3.5" />
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
