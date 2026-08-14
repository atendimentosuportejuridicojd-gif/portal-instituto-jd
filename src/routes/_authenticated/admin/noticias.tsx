import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { PageContent, PageHeader } from "@/components/page";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Trash2, Plus, Newspaper, Pin, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
import {
  adminListNotificacoes,
  adminPublicarNotificacao,
  adminExcluirNotificacao,
} from "@/lib/notificacoes.functions";
import {
  adminListNoticias,
  adminCriarNoticia,
  adminAtualizarNoticia,
  adminExcluirNoticia,
} from "@/lib/noticias.functions";

export const Route = createFileRoute("/_authenticated/admin/noticias")({
  head: () => ({ meta: [{ title: "Notícias & Notificações — Admin J&D" }] }),
  component: AdminNoticiasPage,
});

function AdminNoticiasPage() {
  return (
    <>
      <PageHeader
        title="Notícias & Notificações"
        description="Publique conteúdos do Fique por Dentro e avisos rápidos para os alunos."
      />
      <PageContent>
        <Tabs defaultValue="noticias">
          <TabsList className="mb-6">
            <TabsTrigger value="noticias">Fique por Dentro</TabsTrigger>
            <TabsTrigger value="notificacoes">Notificações</TabsTrigger>
          </TabsList>
          <TabsContent value="noticias">
            <FiquePorDentro />
          </TabsContent>
          <TabsContent value="notificacoes">
            <AdminNotificacoes />
          </TabsContent>
        </Tabs>
      </PageContent>
    </>
  );
}

function FiquePorDentro() {
  const listFn = useServerFn(adminListNoticias);
  const createFn = useServerFn(adminCriarNoticia);
  const updateFn = useServerFn(adminAtualizarNoticia);
  const delFn = useServerFn(adminExcluirNoticia);
  const qc = useQueryClient();

  const empty = { titulo: "", resumo: "", conteudo: "", imagem_url: "", fixado: false, publicado: true };
  const [form, setForm] = useState(empty);

  const q = useQuery({ queryKey: ["admin", "noticias"], queryFn: () => listFn() });
  const invalidate = () => qc.invalidateQueries({ queryKey: ["admin", "noticias"] });

  const criar = useMutation({
    mutationFn: () => createFn({ data: form }),
    onSuccess: () => {
      invalidate();
      setForm(empty);
      toast.success("Notícia publicada.");
    },
    onError: (e: any) => toast.error(e.message),
  });
  const update = useMutation({
    mutationFn: (v: { id: string; fixado?: boolean; publicado?: boolean }) => updateFn({ data: v }),
    onSuccess: invalidate,
    onError: (e: any) => toast.error(e.message),
  });
  const remove = useMutation({
    mutationFn: (id: string) => delFn({ data: { id } }),
    onSuccess: () => {
      invalidate();
      toast.success("Notícia removida.");
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <section className="surface-card p-6 lg:col-span-1">
        <div className="mb-4 flex items-center gap-2">
          <Newspaper className="h-4 w-4 text-primary" />
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Nova notícia
          </h2>
        </div>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label>Título</Label>
            <Input
              value={form.titulo}
              maxLength={200}
              onChange={(e) => setForm({ ...form, titulo: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Resumo</Label>
            <Textarea
              value={form.resumo}
              maxLength={500}
              rows={2}
              onChange={(e) => setForm({ ...form, resumo: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Conteúdo</Label>
            <Textarea
              value={form.conteudo}
              rows={7}
              onChange={(e) => setForm({ ...form, conteudo: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Imagem (URL, opcional)</Label>
            <Input
              value={form.imagem_url}
              onChange={(e) => setForm({ ...form, imagem_url: e.target.value })}
              placeholder="https://…"
            />
          </div>
          <div className="flex items-center justify-between rounded-md border border-border/60 px-3 py-2">
            <Label className="text-xs">Fixar no topo</Label>
            <Switch checked={form.fixado} onCheckedChange={(v) => setForm({ ...form, fixado: v })} />
          </div>
          <div className="flex items-center justify-between rounded-md border border-border/60 px-3 py-2">
            <Label className="text-xs">Publicar imediatamente</Label>
            <Switch checked={form.publicado} onCheckedChange={(v) => setForm({ ...form, publicado: v })} />
          </div>
          <Button
            className="w-full"
            onClick={() => criar.mutate()}
            disabled={!form.titulo.trim() || criar.isPending}
          >
            <Plus className="mr-2 h-4 w-4" />
            Publicar notícia
          </Button>
        </div>
      </section>

      <section className="lg:col-span-2">
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Notícias cadastradas
        </h2>
        <div className="space-y-2">
          {(q.data ?? []).length === 0 && (
            <div className="surface-card p-8 text-center text-sm text-muted-foreground">
              Nenhuma notícia cadastrada.
            </div>
          )}
          {(q.data ?? []).map((n: any) => (
            <div key={n.id} className="surface-card flex items-start justify-between gap-3 p-4">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  {n.fixado && (
                    <Badge variant="secondary" className="text-[10px] uppercase">
                      <Pin className="mr-1 h-3 w-3" />
                      Fixado
                    </Badge>
                  )}
                  <Badge variant={n.publicado ? "default" : "outline"} className="text-[10px] uppercase">
                    {n.publicado ? "Publicada" : "Rascunho"}
                  </Badge>
                  <h3 className="truncate text-sm font-semibold">{n.titulo}</h3>
                </div>
                {n.resumo && <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{n.resumo}</p>}
                <p className="mt-1 text-[11px] uppercase tracking-wider text-muted-foreground">
                  {new Date(n.published_at).toLocaleString("pt-BR")}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label={n.fixado ? "Desafixar" : "Fixar"}
                  onClick={() => update.mutate({ id: n.id, fixado: !n.fixado })}
                >
                  <Pin className="h-3.5 w-3.5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label={n.publicado ? "Despublicar" : "Publicar"}
                  onClick={() => update.mutate({ id: n.id, publicado: !n.publicado })}
                >
                  {n.publicado ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="Remover"
                  onClick={() => remove.mutate(n.id)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

  const listFn = useServerFn(adminListNotificacoes);
  const pubFn = useServerFn(adminPublicarNotificacao);
  const delFn = useServerFn(adminExcluirNotificacao);
  const qc = useQueryClient();

  const [form, setForm] = useState({
    titulo: "",
    mensagem: "",
    tipo: "sistema" as "material" | "noticia" | "cronograma" | "concurso" | "sistema",
    link: "",
  });

  const q = useQuery({ queryKey: ["admin", "notificacoes"], queryFn: () => listFn() });
  const pub = useMutation({
    mutationFn: () =>
      pubFn({
        data: {
          titulo: form.titulo,
          mensagem: form.mensagem,
          tipo: form.tipo,
          link: form.link || null,
          escopo: "todos",
        },
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "notificacoes"] });
      setForm({ titulo: "", mensagem: "", tipo: "sistema", link: "" });
      toast.success("Notificação publicada.");
    },
    onError: (e: any) => toast.error(e.message),
  });
  const remove = useMutation({
    mutationFn: (id: string) => delFn({ data: { id } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "notificacoes"] });
      toast.success("Notificação removida.");
    },
  });

  return (
    <div className="grid gap-6 lg:grid-cols-3">

          <section className="surface-card p-6 lg:col-span-1">
            <div className="mb-4 flex items-center gap-2">
              <Newspaper className="h-4 w-4 text-primary" />
              <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                Nova notificação
              </h2>
            </div>
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label>Título</Label>
                <Input
                  value={form.titulo}
                  onChange={(e) => setForm({ ...form, titulo: e.target.value })}
                  maxLength={200}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Mensagem</Label>
                <Textarea
                  value={form.mensagem}
                  onChange={(e) => setForm({ ...form, mensagem: e.target.value })}
                  maxLength={2000}
                  rows={4}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Tipo</Label>
                <Select value={form.tipo} onValueChange={(v: any) => setForm({ ...form, tipo: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sistema">Sistema</SelectItem>
                    <SelectItem value="material">Material</SelectItem>
                    <SelectItem value="noticia">Notícia</SelectItem>
                    <SelectItem value="cronograma">Cronograma</SelectItem>
                    <SelectItem value="concurso">Concurso</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Link (opcional)</Label>
                <Input
                  value={form.link}
                  onChange={(e) => setForm({ ...form, link: e.target.value })}
                  placeholder="/acervo"
                />
              </div>
              <Button
                className="w-full"
                onClick={() => pub.mutate()}
                disabled={!form.titulo.trim() || pub.isPending}
              >
                <Plus className="mr-2 h-4 w-4" />
                Publicar para todos
              </Button>
            </div>
          </section>

          <section className="lg:col-span-2">
            <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Publicadas
            </h2>
            <div className="space-y-2">
              {(q.data ?? []).length === 0 && (
                <div className="surface-card p-8 text-center text-sm text-muted-foreground">
                  Nenhuma notificação publicada.
                </div>
              )}
              {(q.data ?? []).map((n: any) => (
                <div key={n.id} className="surface-card flex items-start justify-between gap-3 p-4">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="text-[10px] uppercase">{n.tipo}</Badge>
                      <h3 className="truncate text-sm font-semibold">{n.titulo}</h3>
                    </div>
                    {n.mensagem && (
                      <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{n.mensagem}</p>
                    )}
                    <p className="mt-1 text-[11px] uppercase tracking-wider text-muted-foreground">
                      {new Date(n.publicada_em).toLocaleString("pt-BR")}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => remove.mutate(n.id)}
                    aria-label="Remover"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ))}
            </div>
          </section>
        </div>
      </PageContent>
    </>
  );
}
