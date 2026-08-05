import { Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  FileText,
  PencilLine,
  RefreshCw,
  BarChart3,
  Star,
  CheckCircle2,
  Circle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toggleFavorito, toggleMaterialLido } from "@/lib/aluno.functions";
import { toast } from "sonner";

export function MaterialRow({ m }: { m: any }) {
  const qc = useQueryClient();
  const favFn = useServerFn(toggleFavorito);
  const lidoFn = useServerFn(toggleMaterialLido);

  const invalidar = () => {
    qc.invalidateQueries({ queryKey: ["aluno", "acervo"] });
    qc.invalidateQueries({ queryKey: ["favoritos"] });
    qc.invalidateQueries({ queryKey: ["dashboard"] });
  };

  const fav = useMutation({
    mutationFn: () => favFn({ data: { tipo: "material" as const, item_id: m.id } }),
    onSuccess: (r: any) => {
      invalidar();
      toast.success(r?.favorito ? "Adicionado aos favoritos." : "Removido dos favoritos.");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const lido = useMutation({
    mutationFn: () => lidoFn({ data: { material_id: m.id, lido: !m.lido } }),
    onSuccess: (r: any) => {
      invalidar();
      toast.success(r?.lido ? "Material marcado como lido." : "Marcação de leitura removida.");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const jaFez = m.desempenho !== null;
  const temQuestoes = m.total_questoes > 0;
  const perf = m.desempenho as number | null;
  const perfColor =
    perf === null ? "" : perf >= 85 ? "text-green-600" : perf >= 70 ? "text-yellow-600" : "text-red-600";


  return (
    <div className="surface-card flex flex-col gap-3 p-4 transition-shadow hover:shadow-md sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
          <h3 className="truncate text-sm font-semibold">{m.titulo}</h3>
          {m.novo && <Badge className="shrink-0">Novo</Badge>}
          {m.atualizado && (
            <Badge variant="secondary" className="shrink-0">
              Atualizado · v{m.versao}
            </Badge>
          )}
        </div>
        {m.descricao && (
          <p className="mt-1 line-clamp-1 text-xs text-muted-foreground">{m.descricao}</p>
        )}
        <p className="mt-1 text-xs text-muted-foreground">
          📝 {m.total_questoes} {m.total_questoes === 1 ? "questão" : "questões"}
          {m.ultima_pagina ? ` · você parou na página ${m.ultima_pagina}` : ""}
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Button
          variant="ghost"
          size="icon"
          aria-label={m.favorito ? "Remover dos favoritos" : "Adicionar aos favoritos"}
          onClick={() => fav.mutate()}
          disabled={fav.isPending}
        >
          <Star className={cn("h-4 w-4", m.favorito && "fill-gold text-gold")} />
        </Button>
        <Button asChild variant="ghost" size="sm">
          <Link to="/materiais/$materialId/pdf" params={{ materialId: m.id }}>
            <FileText className="mr-1 h-3.5 w-3.5" />
            Visualizar PDF
          </Link>
        </Button>
        {temQuestoes ? (
          <Button asChild variant="outline" size="sm">
            <Link to="/materiais/$materialId/questoes" params={{ materialId: m.id }}>
              {jaFez ? (
                <>
                  <RefreshCw className="mr-1 h-3.5 w-3.5" />
                  Refazer questões
                </>
              ) : (
                <>
                  <PencilLine className="mr-1 h-3.5 w-3.5" />
                  Resolver questões
                </>
              )}
            </Link>
          </Button>
        ) : (
          <Badge variant="secondary" className="text-xs">Sem questões</Badge>
        )}
        {jaFez && (
          <Button asChild variant="ghost" size="sm">
            <Link to="/materiais/$materialId/desempenho" params={{ materialId: m.id }}>
              <BarChart3 className="mr-1 h-3.5 w-3.5" />
              Desempenho: <span className={cn("ml-1 tabular-nums", perfColor)}>{perf}%</span>
            </Link>
          </Button>
        )}
      </div>
    </div>
  );
}
