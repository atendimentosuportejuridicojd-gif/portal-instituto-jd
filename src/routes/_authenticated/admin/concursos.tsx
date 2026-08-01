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
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { FileText, Plus, Trash2, Link2, PencilLine, Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
  adminListConcursos,
  adminUpsertConcurso,
  adminDeleteConcurso,
  adminToggleMaterialConcurso,
} from "@/lib/trilhas.functions";

export const Route = createFileRoute("/_authenticated/admin/concursos")({
  head: () => ({
    meta: [
      { title: "Concursos — Admin J&D" },
      { name: "description", content: "Cadastre concursos específicos e vincule materiais do acervo." },
    ],
  }),
  component: AdminConcursos,
});

function AdminConcursos() {
  const qc = useQueryClient();
  const listFn = useServerFn(adminListConcursos);
  const q = useQuery({ queryKey: ["admin", "concursos"], queryFn: () => listFn() });
  const invalidate = () => qc.invalidateQueries({ queryKey: ["admin", "concursos"] });

  const concursos = q.data?.concursos ?? [];
  const materiais = q.data?.materiais ?? [];

  return (
    <>
      <PageHeader
        title="Concursos Específicos"
        description="Cada concurso reúne materiais do acervo e exclusivos, sempre por vínculo — sem duplicar arquivos."
        actions={<ConcursoDialog onDone={invalidate} />}
      />
      <PageContent>
        {q.isLoading ? (
          <div className="text-sm text-muted-foreground">Carregando…</div>
        ) : concursos.length === 0 ? (
          <EmptyState
            icon={FileText}
            title="Nenhum concurso cadastrado"
            description="Cadastre um edital para reunir os materiais correspondentes."
          />
        ) : (
          <div className="space-y-6">
            {concursos.map((c: any) => (
              <section key={c.id} className="surface-card p-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h2 className="truncate text-base font-semibold">{c.nome}</h2>
                      {!c.publicado && <Badge variant="outline">Rascunho</Badge>}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {[c.orgao, c.banca, c.estado, c.ano].filter(Boolean).join(" · ") || "Sem detalhes"}
                      {" · "}
                      {c.materiais.length} material(is)
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <VincularConcurso
                      concurso={c}
                      materiais={materiais}
                      onDone={invalidate}
                    />
                    <ConcursoDialog concurso={c} onDone={invalidate} />
                    <DeleteConcurso id={c.id} onDone={invalidate} />
                  </div>
                </div>
                {c.materiais.length > 0 && (
                  <ul className="mt-4 space-y-2">
                    {c.materiais.map((m: any) => (
                      <li
                        key={m.id}
                        className="flex items-center justify-between gap-2 rounded-lg border border-border/60 px-3 py-2 text-sm"
                      >
                        <span className="min-w-0 truncate">
                          {m.titulo}
                          <span className="text-xs text-muted-foreground"> · {m.disciplina}</span>
                        </span>
                        {m.exclusivo && <Badge variant="secondary">Exclusivo</Badge>}
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

function DeleteConcurso({ id, onDone }: { id: string; onDone: () => void }) {
  const fn = useServerFn(adminDeleteConcurso);
  const mut = useMutation({
    mutationFn: () => fn({ data: { id } }),
    onSuccess: () => {
      toast.success("Concurso removido.");
      onDone();
    },
    onError: (e: any) => toast.error(e.message),
  });
  return (
    <Button
      variant="ghost"
      size="sm"
      className="text-destructive"
      onClick={() => confirm("Excluir este concurso?") && mut.mutate()}
      disabled={mut.isPending}
    >
      <Trash2 className="mr-1 h-3.5 w-3.5" />
      Excluir
    </Button>
  );
}

function ConcursoDialog({ concurso, onDone }: { concurso?: any; onDone: () => void }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    nome: concurso?.nome ?? "",
    orgao: concurso?.orgao ?? "",
    banca: concurso?.banca ?? "",
    estado: concurso?.estado ?? "",
    ano: concurso?.ano ? String(concurso.ano) : "",
    edital_url: concurso?.edital_url ?? "",
    observacoes: concurso?.observacoes ?? "",
  });
  const [publicado, setPublicado] = useState(concurso?.publicado ?? true);
  const fn = useServerFn(adminUpsertConcurso);
  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const mut = useMutation({
    mutationFn: () =>
      fn({
        data: {
          id: concurso?.id,
          ...form,
          ano: form.ano ? Number(form.ano) : null,
          publicado,
        },
      }),
    onSuccess: () => {
      toast.success("Concurso salvo.");
      setOpen(false);
      onDone();
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {concurso ? (
          <Button variant="ghost" size="sm">
            <PencilLine className="mr-1 h-3.5 w-3.5" />
            Editar
          </Button>
        ) : (
          <Button size="sm">
            <Plus className="mr-1 h-4 w-4" />
            Novo concurso
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{concurso ? "Editar concurso" : "Novo concurso"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {[
            { k: "nome", label: "Nome", ph: "Ex.: TJSC 2026 — Técnico Judiciário" },
            { k: "orgao", label: "Órgão", ph: "Ex.: TJSC" },
            { k: "banca", label: "Banca", ph: "Ex.: FGV" },
            { k: "estado", label: "Estado", ph: "Ex.: SC" },
            { k: "ano", label: "Ano", ph: "Ex.: 2026" },
            { k: "edital_url", label: "Link do edital", ph: "https://…" },
          ].map((f) => (
            <div key={f.k} className="space-y-1.5">
              <Label htmlFor={`c-${f.k}`}>{f.label}</Label>
              <Input
                id={`c-${f.k}`}
                value={(form as any)[f.k]}
                placeholder={f.ph}
                onChange={(e) => set(f.k, e.target.value)}
              />
            </div>
          ))}
          <div className="space-y-1.5">
            <Label htmlFor="c-obs">Observações</Label>
            <Textarea
              id="c-obs"
              value={form.observacoes}
              onChange={(e) => set("observacoes", e.target.value)}
            />
          </div>
          <div className="flex items-center justify-between rounded-lg border border-border/60 p-3">
            <div>
              <p className="text-sm font-medium">Publicado</p>
              <p className="text-xs text-muted-foreground">Visível para os alunos.</p>
            </div>
            <Switch checked={publicado} onCheckedChange={setPublicado} />
          </div>
        </div>
        <DialogFooter>
          <Button onClick={() => mut.mutate()} disabled={mut.isPending || !form.nome.trim()}>
            {mut.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function VincularConcurso({
  concurso,
  materiais,
  onDone,
}: {
  concurso: any;
  materiais: any[];
  onDone: () => void;
}) {
  const [open, setOpen] = useState(false);
  const fn = useServerFn(adminToggleMaterialConcurso);
  const mut = useMutation({
    mutationFn: (payload: any) => fn({ data: payload }),
    onSuccess: () => onDone(),
    onError: (e: any) => toast.error(e.message),
  });

  const vinculados = new Map(concurso.materiais.map((m: any) => [m.id, m]));

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
          <DialogTitle>Materiais de {concurso.nome}</DialogTitle>
          <DialogDescription>
            Marque os materiais do acervo. Use "exclusivo" para conteúdos específicos deste edital.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          {materiais.length === 0 && (
            <p className="text-sm text-muted-foreground">Nenhum material no acervo ainda.</p>
          )}
          {materiais.map((m: any) => {
            const vinculo: any = vinculados.get(m.id);
            const checked = !!vinculo;
            return (
              <div
                key={m.id}
                className="flex items-center gap-3 rounded-lg border border-border/60 p-3 text-sm"
              >
                <Checkbox
                  checked={checked}
                  aria-label={`Vincular ${m.titulo}`}
                  onCheckedChange={(v) =>
                    mut.mutate({
                      concurso_id: concurso.id,
                      material_id: m.id,
                      vincular: !!v,
                      exclusivo: vinculo?.exclusivo ?? false,
                    })
                  }
                />
                <span className="min-w-0 flex-1 truncate">
                  {m.titulo}
                  <span className="text-xs text-muted-foreground"> · {m.disciplina}</span>
                </span>
                {checked && (
                  <label className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Checkbox
                      checked={!!vinculo?.exclusivo}
                      aria-label={`Marcar ${m.titulo} como exclusivo`}
                      onCheckedChange={(v) =>
                        mut.mutate({
                          concurso_id: concurso.id,
                          material_id: m.id,
                          vincular: true,
                          exclusivo: !!v,
                        })
                      }
                    />
                    Exclusivo
                  </label>
                )}
              </div>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
}
