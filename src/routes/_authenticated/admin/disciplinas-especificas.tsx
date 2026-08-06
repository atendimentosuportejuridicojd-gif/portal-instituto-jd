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
import { BookMarked, FileText, Plus, Trash2, Pencil, Upload } from "lucide-react";
import {
  adminListDisciplinasEspecificas,
  adminUpsertDisciplinaEspecifica,
  adminDeleteDisciplinaEspecifica,
} from "@/lib/disciplinas-especificas.functions";
import {
  adminUpsertMaterial,
  adminDeleteMaterial,
  adminCriarUploadUrl,
  adminRegistrarArquivo,
} from "@/lib/acervo.functions";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin/disciplinas-especificas")({
  head: () => ({
    meta: [
      { title: "Disciplinas Específicas — Admin J&D" },
      {
        name: "description",
        content:
          "Cadastre disciplinas e materiais exclusivos de um concurso, fora do Acervo Base do Instituto J&D.",
      },
      { property: "og:title", content: "Disciplinas Específicas — Admin J&D" },
      {
        property: "og:description",
        content: "Matérias exclusivas de concursos abertos, separadas do Acervo Base.",
      },
    ],
  }),
  component: AdminDisciplinasEspecificas,
});

function AdminDisciplinasEspecificas() {
  const qc = useQueryClient();
  const listFn = useServerFn(adminListDisciplinasEspecificas);
  const q = useQuery({ queryKey: ["admin", "disciplinas-especificas"], queryFn: () => listFn() });
  const invalidate = () => qc.invalidateQueries({ queryKey: ["admin", "disciplinas-especificas"] });

  const concursos = q.data?.concursos ?? [];
  const disciplinas = q.data?.disciplinas ?? [];

  return (
    <>
      <PageHeader
        title="Disciplinas Específicas"
        description="Matérias que não fazem parte do Acervo Base e pertencem a um concurso específico. Elas aparecem para o aluno pelo link do concurso no Cronograma."
        actions={<DisciplinaDialog concursos={concursos} onDone={invalidate} />}
      />
      <PageContent>
        {q.isLoading ? (
          <div className="text-sm text-muted-foreground">Carregando…</div>
        ) : concursos.length === 0 ? (
          <EmptyState
            icon={BookMarked}
            title="Cadastre um concurso primeiro"
            description="As disciplinas específicas sempre pertencem a um concurso. Crie o concurso em Gestão › Concursos."
          />
        ) : disciplinas.length === 0 ? (
          <EmptyState
            icon={BookMarked}
            title="Nenhuma disciplina específica"
            description="Clique em “Nova disciplina específica” para adicionar matérias exclusivas de um concurso."
          />
        ) : (
          <div className="space-y-6">
            {concursos
              .filter((c: any) => disciplinas.some((d: any) => d.concurso_id === c.id))
              .map((c: any) => (
                <section key={c.id} className="surface-card p-5">
                  <div className="flex items-center gap-2">
                    <h2 className="text-sm font-semibold">{c.nome}</h2>
                    {!c.publicado && <Badge variant="secondary">Não publicado</Badge>}
                  </div>
                  <div className="mt-4 space-y-4">
                    {disciplinas
                      .filter((d: any) => d.concurso_id === c.id)
                      .map((d: any) => (
                        <DisciplinaCard
                          key={d.id}
                          d={d}
                          concursos={concursos}
                          onDone={invalidate}
                        />
                      ))}
                  </div>
                </section>
              ))}
          </div>
        )}
      </PageContent>
    </>
  );
}

function DisciplinaCard({
  d,
  concursos,
  onDone,
}: {
  d: any;
  concursos: any[];
  onDone: () => void;
}) {
  const removerFn = useServerFn(adminDeleteDisciplinaEspecifica);
  const removerMaterialFn = useServerFn(adminDeleteMaterial);

  const remover = useMutation({
    mutationFn: () => removerFn({ data: { id: d.id } }),
    onSuccess: () => {
      onDone();
      toast.success("Disciplina específica removida.");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const removerMaterial = useMutation({
    mutationFn: (id: string) => removerMaterialFn({ data: { id } }),
    onSuccess: () => {
      onDone();
      toast.success("Material removido.");
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <div className="rounded-md border border-border/60 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="min-w-0">
          <h3 className="truncate text-sm font-semibold">{d.nome}</h3>
          {d.descricao && (
            <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">{d.descricao}</p>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <MaterialDialog disciplinaId={d.id} onDone={onDone} />
          <DisciplinaDialog concursos={concursos} disciplina={d} onDone={onDone} />
          <Button
            variant="ghost"
            size="icon"
            aria-label="Excluir disciplina"
            onClick={() => {
              if (confirm("Excluir esta disciplina específica e desvincular seus materiais?"))
                remover.mutate();
            }}
          >
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        </div>
      </div>

      <div className="mt-3 space-y-2">
        {d.materiais.length === 0 ? (
          <p className="text-xs text-muted-foreground">
            Nenhum material nesta disciplina. Use “Novo material” para adicionar o PDF.
          </p>
        ) : (
          d.materiais.map((m: any) => (
            <div
              key={m.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-md bg-muted/40 px-3 py-2"
            >
              <div className="flex min-w-0 items-center gap-2">
                <FileText className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                <span className="truncate text-xs font-medium">{m.titulo}</span>
                {!m.publicado && <Badge variant="secondary">Rascunho</Badge>}
                {!m.storage_path && <Badge variant="outline">Sem arquivo</Badge>}
                <span className="text-[11px] text-muted-foreground">
                  v{m.versao} · {m.total_questoes} questões
                </span>
              </div>
              <div className="flex items-center gap-1">
                <UploadDialog material={m} onDone={onDone} />
                <MaterialDialog disciplinaId={d.id} material={m} onDone={onDone} />
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="Excluir material"
                  onClick={() => {
                    if (confirm("Excluir este material e seus arquivos?"))
                      removerMaterial.mutate(m.id);
                  }}
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function DisciplinaDialog({
  concursos,
  disciplina,
  onDone,
}: {
  concursos: any[];
  disciplina?: any;
  onDone: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [nome, setNome] = useState(disciplina?.nome ?? "");
  const [descricao, setDescricao] = useState(disciplina?.descricao ?? "");
  const [concursoId, setConcursoId] = useState<string>(disciplina?.concurso_id ?? "");
  const [ordem, setOrdem] = useState(String(disciplina?.ordem ?? 0));
  const salvarFn = useServerFn(adminUpsertDisciplinaEspecifica);

  const salvar = useMutation({
    mutationFn: () =>
      salvarFn({
        data: {
          id: disciplina?.id,
          nome: nome.trim(),
          descricao: descricao.trim(),
          concurso_id: concursoId,
          ordem: Number(ordem) || 0,
        },
      }),
    onSuccess: () => {
      onDone();
      setOpen(false);
      toast.success(disciplina ? "Disciplina atualizada." : "Disciplina específica criada.");
      if (!disciplina) {
        setNome("");
        setDescricao("");
      }
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {disciplina ? (
          <Button variant="ghost" size="icon" aria-label="Editar disciplina">
            <Pencil className="h-4 w-4" />
          </Button>
        ) : (
          <Button>
            <Plus className="mr-1 h-4 w-4" />
            Nova disciplina específica
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {disciplina ? "Editar disciplina específica" : "Nova disciplina específica"}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Concurso</Label>
            <Select value={concursoId} onValueChange={setConcursoId}>
              <SelectTrigger>
                <SelectValue placeholder="Escolher concurso" />
              </SelectTrigger>
              <SelectContent>
                {concursos.map((c: any) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="nome-disc">Nome da disciplina</Label>
            <Input
              id="nome-disc"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Ex.: Estatuto dos Servidores do TJ"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="desc-disc">Descrição (opcional)</Label>
            <Textarea
              id="desc-disc"
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="ordem-disc">Ordem</Label>
            <Input
              id="ordem-disc"
              type="number"
              value={ordem}
              onChange={(e) => setOrdem(e.target.value)}
            />
          </div>
        </div>
        <DialogFooter>
          <Button
            onClick={() => salvar.mutate()}
            disabled={!nome.trim() || !concursoId || salvar.isPending}
          >
            Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function MaterialDialog({
  disciplinaId,
  material,
  onDone,
}: {
  disciplinaId: string;
  material?: any;
  onDone: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [titulo, setTitulo] = useState(material?.titulo ?? "");
  const [descricao, setDescricao] = useState(material?.descricao ?? "");
  const [ordem, setOrdem] = useState(String(material?.ordem ?? 0));
  const salvarFn = useServerFn(adminUpsertMaterial);

  const salvar = useMutation({
    mutationFn: () =>
      salvarFn({
        data: {
          id: material?.id,
          titulo: titulo.trim(),
          descricao: descricao.trim(),
          disciplina_id: disciplinaId,
          modulo_id: null,
          ordem: Number(ordem) || 0,
          publicado: material?.publicado ?? true,
          download_permitido: false,
        },
      }),
    onSuccess: () => {
      onDone();
      setOpen(false);
      toast.success(material ? "Material atualizado." : "Material criado. Agora envie o PDF.");
      if (!material) {
        setTitulo("");
        setDescricao("");
      }
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {material ? (
          <Button variant="ghost" size="icon" aria-label="Editar material">
            <Pencil className="h-4 w-4" />
          </Button>
        ) : (
          <Button variant="outline" size="sm">
            <Plus className="mr-1 h-3.5 w-3.5" />
            Novo material
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{material ? "Editar material" : "Novo material"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="titulo-mat">Título</Label>
            <Input
              id="titulo-mat"
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              placeholder="Ex.: Lei Orgânica — Parte I"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="desc-mat">Descrição (opcional)</Label>
            <Textarea
              id="desc-mat"
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="ordem-mat">Ordem</Label>
            <Input
              id="ordem-mat"
              type="number"
              value={ordem}
              onChange={(e) => setOrdem(e.target.value)}
            />
          </div>
        </div>
        <DialogFooter>
          <Button onClick={() => salvar.mutate()} disabled={!titulo.trim() || salvar.isPending}>
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
        <Button variant="ghost" size="icon" aria-label="Enviar PDF">
          <Upload className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {material.storage_path ? "Substituir PDF" : "Enviar PDF"} — {material.titulo}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="file-pdf">Arquivo PDF</Label>
            <Input id="file-pdf" ref={inputRef} type="file" accept="application/pdf" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="paginas-pdf">Páginas (opcional)</Label>
            <Input
              id="paginas-pdf"
              type="number"
              value={paginas}
              onChange={(e) => setPaginas(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="notas-pdf">Notas da versão (opcional)</Label>
            <Textarea id="notas-pdf" value={notas} onChange={(e) => setNotas(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button onClick={enviar} disabled={enviando}>
            {enviando ? "Enviando…" : "Enviar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
