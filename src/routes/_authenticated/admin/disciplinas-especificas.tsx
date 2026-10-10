import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
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
import { BookMarked, Eye, FileText, Plus, Trash2, Pencil, PencilLine } from "lucide-react";
import {
  adminListDisciplinasEspecificas,
  adminUpsertDisciplinaEspecifica,
  adminDeleteDisciplinaEspecifica,
} from "@/lib/disciplinas-especificas.functions";
import {
  adminUpsertMaterial,
  adminDeleteMaterial,
} from "@/lib/acervo.functions";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin/disciplinas-especificas")({
  head: () => ({
    meta: [
      { title: "Disciplinas Exclusivas — Admin J&D" },
      {
        name: "description",
        content:
          "Cadastre disciplinas e materiais exclusivos de um concurso, fora do Acervo Base do Instituto J&D.",
      },
      { property: "og:title", content: "Disciplinas Exclusivas — Admin J&D" },
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
  const base = q.data?.base ?? [];

  return (
    <>
      <PageHeader
        title="Disciplinas Exclusivas"
        description="Matérias que não fazem parte do Acervo Base e pertencem a um concurso específico. Elas aparecem para o aluno pelo link do concurso no Cronograma."
        actions={<DisciplinaDialog concursos={concursos} base={base} onDone={invalidate} />}
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
            title="Nenhuma disciplina exclusiva"
            description="Clique em “Nova disciplina exclusiva” para adicionar matérias exclusivas de um concurso."
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
                          base={base}
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
  base,
  onDone,
}: {
  d: any;
  concursos: any[];
  base: any[];
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
          <div className="mt-1 flex flex-wrap items-center gap-1.5">
            <Badge variant="outline">{d.grupo === "especificos" ? "Prova: Específicos" : "Prova: Gerais"}</Badge>
            {d.disciplina_base_id ? (
              <Badge variant="secondary">
                ↳ Acervo Base: {base.find((b: any) => b.id === d.disciplina_base_id)?.nome ?? "—"}
              </Badge>
            ) : (
              <span className="text-[11px] text-muted-foreground">Disciplina própria do concurso</span>
            )}
          </div>
          {d.descricao && (
            <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">{d.descricao}</p>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <MaterialDialog disciplinaId={d.id} onDone={onDone} />
          <DisciplinaDialog concursos={concursos} base={base} disciplina={d} onDone={onDone} />
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
            Nenhuma matéria nesta disciplina. Use “Novo material” para começar a escrever.
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
                <span className="text-[11px] text-muted-foreground">
                  {m.total_questoes} questão(ões)
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-1">
                <Button asChild variant="outline" size="sm">
                  <Link
                    to="/admin/materiais/$materialId/editar"
                    params={{ materialId: m.id }}
                    search={{ origem: "disciplinas-especificas" }}
                  >
                    <PencilLine className="mr-1 h-3.5 w-3.5" />
                    Escrever matéria
                  </Link>
                </Button>
                <Button asChild variant="ghost" size="sm">
                  <Link to="/materiais/$materialId/leitura" params={{ materialId: m.id }}>
                    <Eye className="mr-1 h-3.5 w-3.5" />
                    Ver como aluno
                  </Link>
                </Button>
                <MaterialDialog disciplinaId={d.id} material={m} onDone={onDone} />
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="Excluir material"
                  onClick={() => {
                    if (confirm("Excluir esta matéria? Esta ação não pode ser desfeita."))
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
  base,
  disciplina,
  onDone,
}: {
  concursos: any[];
  base: any[];
  disciplina?: any;
  onDone: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [nome, setNome] = useState(disciplina?.nome ?? "");
  const [descricao, setDescricao] = useState(disciplina?.descricao ?? "");
  const [concursoId, setConcursoId] = useState<string>(disciplina?.concurso_id ?? "");
  const [ordem, setOrdem] = useState(String(disciplina?.ordem ?? 0));
  const [grupo, setGrupo] = useState<string>(disciplina?.grupo ?? "gerais");
  const [baseId, setBaseId] = useState<string>(disciplina?.disciplina_base_id ?? "nenhuma");
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
          grupo: grupo as "gerais" | "especificos",
          disciplina_base_id: baseId === "nenhuma" ? null : baseId,
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
            Nova disciplina exclusiva
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {disciplina ? "Editar disciplina específica" : "Nova disciplina exclusiva"}
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
            <Label>Prova do edital</Label>
            <Select value={grupo} onValueChange={setGrupo}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="gerais">Conhecimentos Gerais</SelectItem>
                <SelectItem value="especificos">Conhecimentos Específicos</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Vincular a uma disciplina do Acervo Base (opcional)</Label>
            <Select value={baseId} onValueChange={setBaseId}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="nenhuma">Nenhuma — disciplina própria do concurso</SelectItem>
                {base.map((b: any) => (
                  <SelectItem key={b.id} value={b.id}>
                    {b.codigo ? `${b.codigo} · ` : ""}
                    {b.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              As matérias desta disciplina continuam fora do Acervo Base (o aluno não as vê lá). O vínculo só diz que,
              no cronograma e nos simulados, elas fazem parte da disciplina escolhida. Sem equivalente no Acervo Base,
              deixe em “Nenhuma”.
            </p>
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
  const [publicado, setPublicado] = useState(material?.publicado ?? true);
  const salvarFn = useServerFn(adminUpsertMaterial);
  const navigate = useNavigate();

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
          publicado,
          download_permitido: false,
          tipo: "markdown",
        },
      }),
    onSuccess: ({ id }) => {
      onDone();
      setOpen(false);
      toast.success(material ? "Material atualizado." : "Material criado. Agora escreva a matéria.");
      if (!material) {
        setTitulo("");
        setDescricao("");
        navigate({
          to: "/admin/materiais/$materialId/editar",
          params: { materialId: id },
          search: { origem: "disciplinas-especificas" },
        });
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
          <div className="flex items-center justify-between rounded-md border border-border/60 p-3">
            <div>
              <p className="text-sm font-medium">Publicado</p>
              <p className="text-xs text-muted-foreground">Visível para os alunos.</p>
            </div>
            <Switch checked={publicado} onCheckedChange={setPublicado} />
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
