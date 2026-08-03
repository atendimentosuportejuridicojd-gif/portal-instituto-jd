import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { PageContent, PageHeader, EmptyState } from "@/components/page";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { CalendarDays, Plus, Trash2, Pencil } from "lucide-react";
import { toast } from "sonner";
import {
  adminDeleteCronograma,
  adminDeleteCronogramaItem,
  adminListCronogramas,
  adminUpsertCronograma,
  adminUpsertCronogramaItem,
} from "@/lib/cronogramas.functions";

export const Route = createFileRoute("/_authenticated/admin/cronogramas")({
  head: () => ({
    meta: [
      { title: "Cronogramas — Administração | Instituto J&D" },
      {
        name: "description",
        content: "Monte planos de estudo dia a dia vinculando materiais do acervo, sem duplicar arquivos.",
      },
      { property: "og:title", content: "Cronogramas — Administração | Instituto J&D" },
      { property: "og:description", content: "Gestão de cronogramas e itens diários de estudo." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AdminCronogramas,
});

const SEM_VINCULO = "__none__";

function AdminCronogramas() {
  const qc = useQueryClient();
  const listFn = useServerFn(adminListCronogramas);
  const upsertFn = useServerFn(adminUpsertCronograma);
  const delFn = useServerFn(adminDeleteCronograma);
  const upsertItemFn = useServerFn(adminUpsertCronogramaItem);
  const delItemFn = useServerFn(adminDeleteCronogramaItem);

  const q = useQuery({ queryKey: ["admin", "cronogramas"], queryFn: () => listFn() });
  const invalidate = () => qc.invalidateQueries({ queryKey: ["admin", "cronogramas"] });

  const [form, setForm] = useState<any>(null);
  const [itemForm, setItemForm] = useState<any>(null);

  const salvar = useMutation({
    mutationFn: (d: any) => upsertFn({ data: d }),
    onSuccess: () => {
      toast.success("Cronograma salvo.");
      setForm(null);
      invalidate();
    },
    onError: (e: any) => toast.error(e.message),
  });

  const excluir = useMutation({
    mutationFn: (id: string) => delFn({ data: { id } }),
    onSuccess: () => {
      toast.success("Cronograma excluído.");
      invalidate();
    },
    onError: (e: any) => toast.error(e.message),
  });

  const salvarItem = useMutation({
    mutationFn: (d: any) => upsertItemFn({ data: d }),
    onSuccess: () => {
      toast.success("Item salvo.");
      setItemForm(null);
      invalidate();
    },
    onError: (e: any) => toast.error(e.message),
  });

  const excluirItem = useMutation({
    mutationFn: (id: string) => delItemFn({ data: { id } }),
    onSuccess: () => {
      toast.success("Item removido.");
      invalidate();
    },
    onError: (e: any) => toast.error(e.message),
  });

  const cronogramas = q.data?.cronogramas ?? [];
  const materiais = q.data?.materiais ?? [];
  const trilhas = q.data?.trilhas ?? [];
  const concursos = q.data?.concursos ?? [];

  return (
    <>
      <PageHeader
        title="Cronogramas"
        description="Planos de estudo dia a dia — os materiais são apenas vinculados."
        actions={
          <Dialog
            open={!!form}
            onOpenChange={(o) =>
              setForm(o ? { nome: "", descricao: "", publicado: false } : null)
            }
          >
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="mr-1 h-4 w-4" />
                Novo cronograma
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{form?.id ? "Editar cronograma" : "Novo cronograma"}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>Nome</Label>
                  <Input
                    value={form?.nome ?? ""}
                    onChange={(e) => setForm({ ...form, nome: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Descrição</Label>
                  <Textarea
                    value={form?.descricao ?? ""}
                    onChange={(e) => setForm({ ...form, descricao: e.target.value })}
                  />
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <Label>Trilha</Label>
                    <Select
                      value={form?.trilha_id ?? SEM_VINCULO}
                      onValueChange={(v) =>
                        setForm({ ...form, trilha_id: v === SEM_VINCULO ? null : v })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Sem vínculo" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={SEM_VINCULO}>Sem vínculo</SelectItem>
                        {trilhas.map((t: any) => (
                          <SelectItem key={t.id} value={t.id}>
                            {t.nome}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Concurso</Label>
                    <Select
                      value={form?.concurso_id ?? SEM_VINCULO}
                      onValueChange={(v) =>
                        setForm({ ...form, concurso_id: v === SEM_VINCULO ? null : v })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Sem vínculo" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={SEM_VINCULO}>Sem vínculo</SelectItem>
                        {concursos.map((c: any) => (
                          <SelectItem key={c.id} value={c.id}>
                            {c.nome}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={!!form?.publicado}
                    onCheckedChange={(v) => setForm({ ...form, publicado: v })}
                  />
                  <Label>Publicado para os alunos</Label>
                </div>
              </div>
              <DialogFooter>
                <Button
                  onClick={() =>
                    salvar.mutate({
                      id: form.id,
                      nome: form.nome,
                      descricao: form.descricao || null,
                      trilha_id: form.trilha_id ?? null,
                      concurso_id: form.concurso_id ?? null,
                      publicado: !!form.publicado,
                    })
                  }
                  disabled={salvar.isPending || !form?.nome?.trim()}
                >
                  Salvar
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        }
      />

      <PageContent>
        {q.isLoading ? (
          <div className="text-sm text-muted-foreground">Carregando…</div>
        ) : cronogramas.length === 0 ? (
          <EmptyState
            icon={CalendarDays}
            title="Nenhum cronograma criado"
            description="Crie um cronograma e adicione itens por dia vinculando materiais do acervo."
          />
        ) : (
          <div className="space-y-4">
            {cronogramas.map((c: any) => (
              <section key={c.id} className="surface-card p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-sm font-semibold">{c.nome}</h2>
                      <Badge variant={c.publicado ? "default" : "secondary"} className="text-xs">
                        {c.publicado ? "Publicado" : "Rascunho"}
                      </Badge>
                    </div>
                    {c.descricao && (
                      <p className="mt-1 text-xs text-muted-foreground">{c.descricao}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() =>
                        setForm({
                          id: c.id,
                          nome: c.nome,
                          descricao: c.descricao ?? "",
                          trilha_id: c.trilha_id,
                          concurso_id: c.concurso_id,
                          publicado: c.publicado,
                        })
                      }
                    >
                      <Pencil className="mr-1 h-3.5 w-3.5" />
                      Editar
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() =>
                        setItemForm({ cronograma_id: c.id, titulo: "", dia: 1, ordem: 0 })
                      }
                    >
                      <Plus className="mr-1 h-3.5 w-3.5" />
                      Item
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label="Excluir cronograma"
                      onClick={() => excluir.mutate(c.id)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>

                {c.itens.length === 0 ? (
                  <p className="mt-4 text-xs text-muted-foreground">Sem itens cadastrados.</p>
                ) : (
                  <div className="mt-4 space-y-2">
                    {c.itens.map((i: any) => (
                      <div
                        key={i.id}
                        className="flex items-center justify-between gap-3 rounded-md border border-border/60 p-3"
                      >
                        <div className="min-w-0">
                          <p className="truncate text-sm">
                            <span className="text-eyebrow mr-2">Dia {i.dia}</span>
                            {i.titulo}
                          </p>
                          <p className="truncate text-xs text-muted-foreground">
                            {materiais.find((m: any) => m.id === i.material_id)?.titulo ??
                              "Sem material vinculado"}
                          </p>
                        </div>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            aria-label="Editar item"
                            onClick={() =>
                              setItemForm({
                                id: i.id,
                                cronograma_id: c.id,
                                titulo: i.titulo,
                                observacoes: i.observacoes ?? "",
                                dia: i.dia,
                                ordem: i.ordem,
                                material_id: i.material_id,
                              })
                            }
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            aria-label="Remover item"
                            onClick={() => excluirItem.mutate(i.id)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            ))}
          </div>
        )}
      </PageContent>

      <Dialog open={!!itemForm} onOpenChange={(o) => !o && setItemForm(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{itemForm?.id ? "Editar item" : "Novo item"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Título</Label>
              <Input
                value={itemForm?.titulo ?? ""}
                onChange={(e) => setItemForm({ ...itemForm, titulo: e.target.value })}
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label>Dia</Label>
                <Input
                  type="number"
                  min={1}
                  value={itemForm?.dia ?? 1}
                  onChange={(e) => setItemForm({ ...itemForm, dia: Number(e.target.value) || 1 })}
                />
              </div>
              <div>
                <Label>Ordem</Label>
                <Input
                  type="number"
                  min={0}
                  value={itemForm?.ordem ?? 0}
                  onChange={(e) => setItemForm({ ...itemForm, ordem: Number(e.target.value) || 0 })}
                />
              </div>
            </div>
            <div>
              <Label>Material vinculado</Label>
              <Select
                value={itemForm?.material_id ?? SEM_VINCULO}
                onValueChange={(v) =>
                  setItemForm({ ...itemForm, material_id: v === SEM_VINCULO ? null : v })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Sem material" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={SEM_VINCULO}>Sem material</SelectItem>
                  {materiais.map((m: any) => (
                    <SelectItem key={m.id} value={m.id}>
                      {m.titulo}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Observações</Label>
              <Textarea
                value={itemForm?.observacoes ?? ""}
                onChange={(e) => setItemForm({ ...itemForm, observacoes: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              onClick={() =>
                salvarItem.mutate({
                  id: itemForm.id,
                  cronograma_id: itemForm.cronograma_id,
                  titulo: itemForm.titulo,
                  observacoes: itemForm.observacoes || null,
                  dia: Number(itemForm.dia) || 1,
                  ordem: Number(itemForm.ordem) || 0,
                  material_id: itemForm.material_id ?? null,
                })
              }
              disabled={salvarItem.isPending || !itemForm?.titulo?.trim()}
            >
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
