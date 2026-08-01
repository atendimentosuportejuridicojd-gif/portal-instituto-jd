import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { PageContent, PageHeader, EmptyState } from "@/components/page";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Target, Plus, Trash2, Link2, PencilLine, Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
  adminListTrilhas,
  adminUpsertTrilha,
  adminDeleteTrilha,
  adminToggleMaterialTrilha,
} from "@/lib/trilhas.functions";

export const Route = createFileRoute("/_authenticated/admin/trilhas")({
  head: () => ({
    meta: [
      { title: "Trilhas — Admin J&D" },
      { name: "description", content: "Monte as trilhas de preparação vinculando materiais do acervo." },
    ],
  }),
  component: AdminTrilhas,
});

function AdminTrilhas() {
  const qc = useQueryClient();
  const listFn = useServerFn(adminListTrilhas);
  const q = useQuery({ queryKey: ["admin", "trilhas"], queryFn: () => listFn() });
  const invalidate = () => qc.invalidateQueries({ queryKey: ["admin", "trilhas"] });

  const trilhas = q.data?.trilhas ?? [];
  const materiais = q.data?.materiais ?? [];

  return (
    <>
      <PageHeader
        title="Trilhas de Preparação"
        description="Vincule materiais do acervo. O arquivo permanece único — a trilha apenas cria o vínculo."
        actions={<TrilhaDialog onDone={invalidate} />}
      />
      <PageContent>
        {q.isLoading ? (
          <div className="text-sm text-muted-foreground">Carregando…</div>
        ) : trilhas.length === 0 ? (
          <EmptyState
            icon={Target}
            title="Nenhuma trilha cadastrada"
            description="Crie as trilhas Técnico e Analista para organizar o estudo."
          />
        ) : (
          <div className="space-y-6">
            {trilhas.map((t: any) => (
              <section key={t.id} className="surface-card p-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="min-w-0">
                    <h2 className="truncate text-base font-semibold">{t.nome}</h2>
                    <p className="text-xs text-muted-foreground">
                      {t.materiais.length} material(is) vinculado(s)
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <VincularDialog
                      titulo={t.nome}
                      materiais={materiais}
                      vinculados={t.materiais.map((m: any) => m.id)}
                      onToggle={(materialId, vincular) => ({
                        trilha_id: t.id,
                        material_id: materialId,
                        vincular,
                      })}
                      onDone={invalidate}
                    />
                    <TrilhaDialog trilha={t} onDone={invalidate} />
                    <DeleteTrilha id={t.id} onDone={invalidate} />
                  </div>
                </div>
                {t.materiais.length > 0 && (
                  <ul className="mt-4 space-y-2">
                    {t.materiais.map((m: any) => (
                      <li
                        key={m.id}
                        className="flex items-center justify-between rounded-lg border border-border/60 px-3 py-2 text-sm"
                      >
                        <span className="truncate">
                          {m.titulo}{" "}
                          <span className="text-xs text-muted-foreground">· {m.disciplina}</span>
                        </span>
                        {!m.tem_arquivo && (
                          <Badge variant="outline" className="text-destructive">Sem arquivo</Badge>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            ))}
          </div>
        )}
      </PageContent>
    </>
  );
}

function DeleteTrilha({ id, onDone }: { id: string; onDone: () => void }) {
  const fn = useServerFn(adminDeleteTrilha);
  const mut = useMutation({
    mutationFn: () => fn({ data: { id } }),
    onSuccess: () => {
      toast.success("Trilha removida.");
      onDone();
    },
    onError: (e: any) => toast.error(e.message),
  });
  return (
    <Button
      variant="ghost"
      size="sm"
      className="text-destructive"
      onClick={() => confirm("Excluir esta trilha?") && mut.mutate()}
      disabled={mut.isPending}
    >
      <Trash2 className="mr-1 h-3.5 w-3.5" />
      Excluir
    </Button>
  );
}

function TrilhaDialog({ trilha, onDone }: { trilha?: any; onDone: () => void }) {
  const [open, setOpen] = useState(false);
  const [nome, setNome] = useState(trilha?.nome ?? "");
  const [descricao, setDescricao] = useState(trilha?.descricao ?? "");
  const [ordem, setOrdem] = useState(String(trilha?.ordem ?? 0));
  const fn = useServerFn(adminUpsertTrilha);

  const mut = useMutation({
    mutationFn: () =>
      fn({ data: { id: trilha?.id, nome, descricao, ordem: Number(ordem) || 0 } }),
    onSuccess: () => {
      toast.success("Trilha salva.");
      setOpen(false);
      onDone();
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trilha ? (
          <Button variant="ghost" size="sm">
            <PencilLine className="mr-1 h-3.5 w-3.5" />
            Editar
          </Button>
        ) : (
          <Button size="sm">
            <Plus className="mr-1 h-4 w-4" />
            Nova trilha
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{trilha ? "Editar trilha" : "Nova trilha"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="t-nome">Nome</Label>
            <Input
              id="t-nome"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Ex.: Técnico Judiciário"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="t-desc">Descrição</Label>
            <Textarea id="t-desc" value={descricao} onChange={(e) => setDescricao(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="t-ordem">Ordem</Label>
            <Input id="t-ordem" value={ordem} onChange={(e) => setOrdem(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button onClick={() => mut.mutate()} disabled={mut.isPending || !nome.trim()}>
            {mut.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function VincularDialog({
  titulo,
  materiais,
  vinculados,
  onToggle,
  onDone,
}: {
  titulo: string;
  materiais: any[];
  vinculados: string[];
  onToggle: (materialId: string, vincular: boolean) => any;
  onDone: () => void;
}) {
  const [open, setOpen] = useState(false);
  const fn = useServerFn(adminToggleMaterialTrilha);
  const mut = useMutation({
    mutationFn: (payload: any) => fn({ data: payload }),
    onSuccess: () => onDone(),
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Link2 className="mr-1 h-3.5 w-3.5" />
          Vincular materiais
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Materiais de {titulo}</DialogTitle>
          <DialogDescription>
            Marque os materiais do acervo que fazem parte desta trilha.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          {materiais.length === 0 && (
            <p className="text-sm text-muted-foreground">Nenhum material no acervo ainda.</p>
          )}
          {materiais.map((m: any) => {
            const checked = vinculados.includes(m.id);
            return (
              <label
                key={m.id}
                className="flex cursor-pointer items-center gap-3 rounded-lg border border-border/60 p-3 text-sm"
              >
                <Checkbox
                  checked={checked}
                  onCheckedChange={(v) => mut.mutate(onToggle(m.id, !!v))}
                />
                <span className="min-w-0 flex-1 truncate">
                  {m.titulo}
                  <span className="text-xs text-muted-foreground"> · {m.disciplina}</span>
                </span>
              </label>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
}
