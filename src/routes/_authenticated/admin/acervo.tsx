import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRef, useState } from "react";
import { PageContent, PageHeader, EmptyState } from "@/components/page";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  BookOpen,
  FileText,
  Plus,
  Trash2,
  Upload,
  History,
  Eye,
  Loader2,
  PencilLine,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import {
  adminListAcervo,
  adminUpsertDisciplina,
  adminDeleteDisciplina,
  adminUpsertModulo,
  adminDeleteModulo,
  adminUpsertMaterial,
  adminDeleteMaterial,
  adminCriarUploadUrl,
  adminRegistrarArquivo,
  adminListVersoesMaterial,
  adminUrlArquivo,
} from "@/lib/acervo.functions";

export const Route = createFileRoute("/_authenticated/admin/acervo")({
  head: () => ({
    meta: [
      { title: "Acervo Base — Admin J&D" },
      { name: "description", content: "Gerencie disciplinas, módulos e materiais em PDF do acervo." },
    ],
  }),
  component: AdminAcervo,
});

function AdminAcervo() {
  const qc = useQueryClient();
  const listFn = useServerFn(adminListAcervo);
  const q = useQuery({ queryKey: ["admin", "acervo"], queryFn: () => listFn() });
  const invalidate = () => qc.invalidateQueries({ queryKey: ["admin", "acervo"] });

  const disciplinas = q.data?.disciplinas ?? [];
  const semDisciplina = q.data?.sem_disciplina ?? [];

  return (
    <>
      <PageHeader
        title="Acervo Base"
        description="Disciplinas, módulos e materiais em PDF. O arquivo é único: ao substituir, a nova versão reflete em trilhas e concursos."
        actions={<DisciplinaDialog onDone={invalidate} />}
      />
      <PageContent>
        {q.isLoading ? (
          <div className="text-sm text-muted-foreground">Carregando…</div>
        ) : disciplinas.length === 0 && semDisciplina.length === 0 ? (
          <EmptyState
            icon={BookOpen}
            title="Nenhuma disciplina cadastrada"
            description="Crie a primeira disciplina para começar a organizar o acervo."
          />
        ) : (
          <div className="space-y-8">
            {disciplinas.map((d: any) => (
              <section key={d.id} className="surface-card p-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="min-w-0">
                    <h2 className="truncate text-base font-semibold">{d.nome}</h2>
                    <p className="text-xs text-muted-foreground">
                      {d.materiais.length} material(is) · {d.modulos.length} módulo(s)
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <ModuloDialog disciplinaId={d.id} onDone={invalidate} />
                    <MaterialDialog disciplina={d} onDone={invalidate} />
                    <DisciplinaDialog disciplina={d} onDone={invalidate} />
                    <DeleteButton
                      label="Excluir disciplina"
                      fn={adminDeleteDisciplina}
                      id={d.id}
                      onDone={invalidate}
                    />
                  </div>
                </div>

                {d.modulos.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {d.modulos.map((mo: any) => (
                      <span
                        key={mo.id}
                        className="inline-flex items-center gap-1 rounded-full border border-border/60 px-2.5 py-1 text-xs text-muted-foreground"
                      >
                        {mo.nome}
                        <DeleteButton
                          label="Excluir módulo"
                          fn={adminDeleteModulo}
                          id={mo.id}
                          onDone={invalidate}
                          compact
                        />
                      </span>
                    ))}
                  </div>
                )}

                <div className="mt-4 space-y-2">
                  {d.materiais.length === 0 ? (
                    <p className="text-xs text-muted-foreground">Nenhum material nesta disciplina.</p>
                  ) : (
                    d.materiais.map((m: any) => (
                      <MaterialRow key={m.id} m={m} disciplina={d} onDone={invalidate} />
                    ))
                  )}
                </div>
              </section>
            ))}

            {semDisciplina.length > 0 && (
              <section className="surface-card p-5">
                <h2 className="text-base font-semibold">Sem disciplina</h2>
                <div className="mt-4 space-y-2">
                  {semDisciplina.map((m: any) => (
                    <MaterialRow key={m.id} m={m} disciplina={null} onDone={invalidate} />
                  ))}
                </div>
              </section>
            )}
          </div>
        )}
      </PageContent>
    </>
  );
}

function MaterialRow({ m, disciplina, onDone }: { m: any; disciplina: any; onDone: () => void }) {
  const urlFn = useServerFn(adminUrlArquivo);
  const abrir = useMutation({
    mutationFn: () => urlFn({ data: { storage_path: m.storage_path } }),
    onSuccess: (r: any) => window.open(r.url, "_blank", "noopener"),
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-border/60 p-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
          <span className="truncate text-sm font-medium">{m.titulo}</span>
          <Badge variant="secondary" className="shrink-0">v{m.versao}</Badge>
          {!m.publicado && <Badge variant="outline" className="shrink-0">Rascunho</Badge>}
          {!m.storage_path && (
            <Badge variant="outline" className="shrink-0 text-destructive">Sem arquivo</Badge>
          )}
        </div>
        <p className="mt-1 text-xs text-muted-foreground">
          {m.total_questoes} questão(ões)
          {m.paginas ? ` · ${m.paginas} páginas` : ""}
          {m.tamanho_bytes ? ` · ${(m.tamanho_bytes / 1024 / 1024).toFixed(1)} MB` : ""}
          {m.download_permitido ? " · download liberado" : ""}
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {m.storage_path && (
          <Button variant="ghost" size="sm" onClick={() => abrir.mutate()} disabled={abrir.isPending}>
            <Eye className="mr-1 h-3.5 w-3.5" />
            Ver
          </Button>
        )}
        <UploadDialog material={m} onDone={onDone} />
        <VersoesDialog material={m} />
        <MaterialDialog disciplina={disciplina} material={m} onDone={onDone} />
        <DeleteButton label="Excluir material" fn={adminDeleteMaterial} id={m.id} onDone={onDone} />
      </div>
    </div>
  );
}

function DeleteButton({
  label,
  fn,
  id,
  onDone,
  compact,
}: {
  label: string;
  fn: any;
  id: string;
  onDone: () => void;
  compact?: boolean;
}) {
  const call = useServerFn(fn);
  const mut = useMutation({
    mutationFn: () => call({ data: { id } }),
    onSuccess: () => {
      toast.success("Removido.");
      onDone();
    },
    onError: (e: any) => toast.error(e.message),
  });
  return (
    <Button
      variant="ghost"
      size={compact ? "icon" : "sm"}
      aria-label={label}
      title={label}
      className={compact ? "h-5 w-5 text-muted-foreground" : "text-destructive"}
      onClick={() => {
        if (confirm(`${label}? Esta ação não pode ser desfeita.`)) mut.mutate();
      }}
      disabled={mut.isPending}
    >
      <Trash2 className={compact ? "h-3 w-3" : "mr-1 h-3.5 w-3.5"} />
      {!compact && "Excluir"}
    </Button>
  );
}

function DisciplinaDialog({ disciplina, onDone }: { disciplina?: any; onDone: () => void }) {
  const [open, setOpen] = useState(false);
  const [nome, setNome] = useState(disciplina?.nome ?? "");
  const [descricao, setDescricao] = useState(disciplina?.descricao ?? "");
  const [ordem, setOrdem] = useState(String(disciplina?.ordem ?? 0));
  const [grupo, setGrupo] = useState<string>(disciplina?.grupo ?? "gerais");
  const fn = useServerFn(adminUpsertDisciplina);

  const mut = useMutation({
    mutationFn: () =>
      fn({
        data: {
          id: disciplina?.id,
          nome,
          descricao,
          ordem: Number(ordem) || 0,
          grupo: grupo as "gerais" | "especificos",
        },
      }),
    onSuccess: () => {
      toast.success("Disciplina salva.");
      setOpen(false);
      onDone();
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {disciplina ? (
          <Button variant="ghost" size="sm">
            <PencilLine className="mr-1 h-3.5 w-3.5" />
            Editar
          </Button>
        ) : (
          <Button size="sm">
            <Plus className="mr-1 h-4 w-4" />
            Nova disciplina
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{disciplina ? "Editar disciplina" : "Nova disciplina"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="d-nome">Nome</Label>
            <Input id="d-nome" value={nome} onChange={(e) => setNome(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="d-desc">Descrição</Label>
            <Textarea id="d-desc" value={descricao} onChange={(e) => setDescricao(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="d-ordem">Ordem</Label>
            <Input id="d-ordem" value={ordem} onChange={(e) => setOrdem(e.target.value)} />
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

function ModuloDialog({ disciplinaId, onDone }: { disciplinaId: string; onDone: () => void }) {
  const [open, setOpen] = useState(false);
  const [nome, setNome] = useState("");
  const [ordem, setOrdem] = useState("0");
  const fn = useServerFn(adminUpsertModulo);

  const mut = useMutation({
    mutationFn: () =>
      fn({ data: { disciplina_id: disciplinaId, nome, ordem: Number(ordem) || 0 } }),
    onSuccess: () => {
      toast.success("Módulo salvo.");
      setNome("");
      setOpen(false);
      onDone();
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm">
          <Plus className="mr-1 h-3.5 w-3.5" />
          Módulo
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Novo módulo</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="mo-nome">Nome</Label>
            <Input id="mo-nome" value={nome} onChange={(e) => setNome(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="mo-ordem">Ordem</Label>
            <Input id="mo-ordem" value={ordem} onChange={(e) => setOrdem(e.target.value)} />
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

function MaterialDialog({
  disciplina,
  material,
  onDone,
}: {
  disciplina: any;
  material?: any;
  onDone: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [titulo, setTitulo] = useState(material?.titulo ?? "");
  const [descricao, setDescricao] = useState(material?.descricao ?? "");
  const [moduloId, setModuloId] = useState<string>(material?.modulo_id ?? "none");
  const [ordem, setOrdem] = useState(String(material?.ordem ?? 0));
  const [publicado, setPublicado] = useState(material?.publicado ?? true);
  const [download, setDownload] = useState(material?.download_permitido ?? false);
  const fn = useServerFn(adminUpsertMaterial);

  const mut = useMutation({
    mutationFn: () =>
      fn({
        data: {
          id: material?.id,
          titulo,
          descricao,
          disciplina_id: disciplina?.id ?? null,
          modulo_id: moduloId === "none" ? null : moduloId,
          ordem: Number(ordem) || 0,
          publicado,
          download_permitido: download,
        },
      }),
    onSuccess: () => {
      toast.success("Material salvo.");
      setOpen(false);
      onDone();
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {material ? (
          <Button variant="ghost" size="sm">
            <PencilLine className="mr-1 h-3.5 w-3.5" />
            Editar
          </Button>
        ) : (
          <Button variant="outline" size="sm">
            <Plus className="mr-1 h-3.5 w-3.5" />
            Material
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{material ? "Editar material" : "Novo material"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="m-titulo">Título</Label>
            <Input id="m-titulo" value={titulo} onChange={(e) => setTitulo(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="m-desc">Descrição</Label>
            <Textarea id="m-desc" value={descricao} onChange={(e) => setDescricao(e.target.value)} />
          </div>
          {disciplina?.modulos?.length > 0 && (
            <div className="space-y-1.5">
              <Label>Módulo</Label>
              <Select value={moduloId} onValueChange={setModuloId}>
                <SelectTrigger>
                  <SelectValue placeholder="Sem módulo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sem módulo</SelectItem>
                  {disciplina.modulos.map((mo: any) => (
                    <SelectItem key={mo.id} value={mo.id}>
                      {mo.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <div className="space-y-1.5">
            <Label htmlFor="m-ordem">Ordem</Label>
            <Input id="m-ordem" value={ordem} onChange={(e) => setOrdem(e.target.value)} />
          </div>
          <div className="flex items-center justify-between rounded-lg border border-border/60 p-3">
            <div>
              <p className="text-sm font-medium">Publicado</p>
              <p className="text-xs text-muted-foreground">Visível para os alunos.</p>
            </div>
            <Switch checked={publicado} onCheckedChange={setPublicado} />
          </div>
          <div className="flex items-center justify-between rounded-lg border border-border/60 p-3">
            <div>
              <p className="text-sm font-medium">Permitir download</p>
              <p className="text-xs text-muted-foreground">Por padrão, leitura apenas no portal.</p>
            </div>
            <Switch checked={download} onCheckedChange={setDownload} />
          </div>
        </div>
        <DialogFooter>
          <Button onClick={() => mut.mutate()} disabled={mut.isPending || !titulo.trim()}>
            {mut.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function UploadDialog({ material, onDone }: { material: any; onDone: () => void }) {
  const [open, setOpen] = useState(false);
  const [notas, setNotas] = useState("");
  const [paginas, setPaginas] = useState("");
  const [enviando, setEnviando] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const criarUrl = useServerFn(adminCriarUploadUrl);
  const registrar = useServerFn(adminRegistrarArquivo);

  const enviar = async () => {
    const file = inputRef.current?.files?.[0];
    if (!file) return toast.error("Selecione um arquivo PDF.");
    if (file.type !== "application/pdf") return toast.error("O arquivo precisa ser um PDF.");
    setEnviando(true);
    try {
      const { storage_path, token } = await criarUrl({
        data: { material_id: material.id, nome_arquivo: file.name },
      });
      const { error } = await supabase.storage
        .from("materiais")
        .uploadToSignedUrl(storage_path, token, file, { contentType: "application/pdf" });
      if (error) throw new Error(error.message);

      await registrar({
        data: {
          material_id: material.id,
          storage_path,
          tamanho_bytes: file.size,
          paginas: paginas ? Number(paginas) : undefined,
          notas,
        },
      });
      toast.success(material.storage_path ? "Nova versão publicada." : "Arquivo publicado.");
      setOpen(false);
      setNotas("");
      setPaginas("");
      onDone();
    } catch (e: any) {
      toast.error(e.message ?? "Falha no envio.");
    } finally {
      setEnviando(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Upload className="mr-1 h-3.5 w-3.5" />
          {material.storage_path ? "Substituir PDF" : "Enviar PDF"}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {material.storage_path ? "Substituir arquivo (nova versão)" : "Enviar arquivo PDF"}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <p className="text-xs text-muted-foreground">
            O arquivo é único no sistema: trilhas e concursos que usam este material passam a exibir
            automaticamente a versão mais recente.
          </p>
          <div className="space-y-1.5">
            <Label htmlFor="arquivo">Arquivo PDF</Label>
            <Input id="arquivo" type="file" accept="application/pdf" ref={inputRef} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="paginas">Número de páginas (opcional)</Label>
            <Input
              id="paginas"
              value={paginas}
              onChange={(e) => setPaginas(e.target.value.replace(/\D/g, ""))}
              placeholder="Ex.: 120"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="notas">Notas da versão (opcional)</Label>
            <Textarea
              id="notas"
              value={notas}
              onChange={(e) => setNotas(e.target.value)}
              placeholder="Ex.: atualização da Lei 14.133/2021"
            />
          </div>
        </div>
        <DialogFooter>
          <Button onClick={enviar} disabled={enviando}>
            {enviando && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Enviar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function VersoesDialog({ material }: { material: any }) {
  const [open, setOpen] = useState(false);
  const listFn = useServerFn(adminListVersoesMaterial);
  const q = useQuery({
    queryKey: ["admin", "material-versoes", material.id],
    queryFn: () => listFn({ data: { material_id: material.id } }),
    enabled: open,
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm">
          <History className="mr-1 h-3.5 w-3.5" />
          Versões
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Histórico de versões</DialogTitle>
        </DialogHeader>
        {q.isLoading ? (
          <p className="text-sm text-muted-foreground">Carregando…</p>
        ) : (q.data ?? []).length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhuma versão registrada.</p>
        ) : (
          <ul className="space-y-2">
            {(q.data ?? []).map((v: any) => (
              <li key={v.id} className="rounded-lg border border-border/60 p-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Versão {v.versao}</span>
                  <span className="text-xs text-muted-foreground">
                    {new Date(v.created_at).toLocaleDateString("pt-BR")}
                  </span>
                </div>
                {v.notas && <p className="mt-1 text-xs text-muted-foreground">{v.notas}</p>}
              </li>
            ))}
          </ul>
        )}
      </DialogContent>
    </Dialog>
  );
}
