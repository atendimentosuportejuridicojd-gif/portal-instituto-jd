import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { PageContent, PageHeader, EmptyState } from "@/components/page";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
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
import { CalendarDays, FileText, Plus, Trash2, Pencil } from "lucide-react";
import {
  alunoListPlano,
  alunoSalvarPlanoItem,
  alunoTogglePlanoItem,
  alunoDeletePlanoItem,
} from "@/lib/cronogramas.functions";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/cronogramas")({
  head: () => ({
    meta: [
      { title: "Meu Cronograma de Estudos — Portal do Aluno | Instituto J&D" },
      {
        name: "description",
        content:
          "Monte o seu próprio plano de estudos no Instituto J&D: escolha os materiais, defina as datas conforme sua disponibilidade e marque o que já concluiu.",
      },
      { property: "og:title", content: "Meu Cronograma de Estudos — Portal do Aluno" },
      {
        property: "og:description",
        content: "Você monta o plano de estudos do seu jeito, no seu ritmo.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: MeuCronograma,
});

type Item = {
  id: string;
  titulo: string;
  material_id: string | null;
  data: string;
  observacoes: string | null;
  concluido: boolean;
  ordem: number;
};

const hoje = () => new Date().toISOString().slice(0, 10);

function formatarData(iso: string) {
  const [a, m, d] = iso.split("-");
  return `${d}/${m}/${a}`;
}

function MeuCronograma() {
  const qc = useQueryClient();
  const listFn = useServerFn(alunoListPlano);
  const salvarFn = useServerFn(alunoSalvarPlanoItem);
  const toggleFn = useServerFn(alunoTogglePlanoItem);
  const deleteFn = useServerFn(alunoDeletePlanoItem);

  const q = useQuery({ queryKey: ["aluno", "plano"], queryFn: () => listFn() });
  const itens = (q.data?.itens ?? []) as Item[];
  const materiais = q.data?.materiais ?? [];

  const [aberto, setAberto] = useState(false);
  const [edit, setEdit] = useState<Item | null>(null);
  const [titulo, setTitulo] = useState("");
  const [materialId, setMaterialId] = useState<string>("nenhum");
  const [data, setData] = useState(hoje());
  const [obs, setObs] = useState("");

  const invalidar = () => qc.invalidateQueries({ queryKey: ["aluno", "plano"] });

  const abrirNovo = () => {
    setEdit(null);
    setTitulo("");
    setMaterialId("nenhum");
    setData(hoje());
    setObs("");
    setAberto(true);
  };

  const abrirEdicao = (i: Item) => {
    setEdit(i);
    setTitulo(i.titulo);
    setMaterialId(i.material_id ?? "nenhum");
    setData(i.data);
    setObs(i.observacoes ?? "");
    setAberto(true);
  };

  const salvar = useMutation({
    mutationFn: () =>
      salvarFn({
        data: {
          id: edit?.id,
          titulo: titulo.trim(),
          material_id: materialId === "nenhum" ? null : materialId,
          data,
          observacoes: obs.trim() || null,
          ordem: edit?.ordem ?? 0,
        },
      }),
    onSuccess: () => {
      invalidar();
      setAberto(false);
      toast.success(edit ? "Sessão de estudo atualizada." : "Sessão adicionada ao seu plano.");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const toggle = useMutation({
    mutationFn: (v: { id: string; concluido: boolean }) => toggleFn({ data: v }),
    onSuccess: () => invalidar(),
    onError: (e: any) => toast.error(e.message),
  });

  const remover = useMutation({
    mutationFn: (id: string) => deleteFn({ data: { id } }),
    onSuccess: () => {
      invalidar();
      toast.success("Item removido do seu plano.");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const dias = [...new Set(itens.map((i) => i.data))].sort();
  const concluidos = itens.filter((i) => i.concluido).length;

  const escolherMaterial = (id: string) => {
    setMaterialId(id);
    const m = materiais.find((x: any) => x.id === id);
    if (m && !titulo.trim()) setTitulo(m.titulo);
  };

  return (
    <>
      <PageHeader
        title="Meu Cronograma"
        description="Monte seu plano de estudos de acordo com a sua disponibilidade e o seu ritmo."
        actions={
          <Dialog open={aberto} onOpenChange={setAberto}>
            <DialogTrigger asChild>
              <Button onClick={abrirNovo}>
                <Plus className="mr-1 h-4 w-4" />
                Nova sessão de estudo
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{edit ? "Editar sessão" : "Nova sessão de estudo"}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <Label>Material (opcional)</Label>
                  <Select value={materialId} onValueChange={escolherMaterial}>
                    <SelectTrigger>
                      <SelectValue placeholder="Escolher material" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="nenhum">Sem material vinculado</SelectItem>
                      {materiais.map((m: any) => (
                        <SelectItem key={m.id} value={m.id}>
                          {m.disciplina} — {m.titulo}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="titulo">O que você vai estudar</Label>
                  <Input
                    id="titulo"
                    value={titulo}
                    onChange={(e) => setTitulo(e.target.value)}
                    placeholder="Ex.: Ler capítulo 1 e resolver questões"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="data">Data</Label>
                  <Input
                    id="data"
                    type="date"
                    value={data}
                    onChange={(e) => setData(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="obs">Observações (opcional)</Label>
                  <Textarea
                    id="obs"
                    value={obs}
                    onChange={(e) => setObs(e.target.value)}
                    placeholder="Ex.: estudar das 19h às 21h"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button
                  onClick={() => salvar.mutate()}
                  disabled={!titulo.trim() || !data || salvar.isPending}
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
        ) : itens.length === 0 ? (
          <EmptyState
            icon={CalendarDays}
            title="Seu plano de estudos está vazio"
            description="Clique em “Nova sessão de estudo” para montar o cronograma do seu jeito, escolhendo os materiais e as datas que cabem na sua rotina."
          />
        ) : (
          <div className="space-y-6">
            <p className="text-xs text-muted-foreground">
              {concluidos} de {itens.length} sessões concluídas.
            </p>
            {dias.map((dia) => (
              <section key={dia} className="surface-card p-5">
                <div className="flex items-center gap-2">
                  <CalendarDays className="h-4 w-4 text-muted-foreground" />
                  <h2 className="text-sm font-semibold">{formatarData(dia)}</h2>
                  {dia === hoje() && <Badge>Hoje</Badge>}
                </div>
                <div className="mt-4 space-y-2">
                  {itens
                    .filter((i) => i.data === dia)
                    .map((i) => (
                      <div
                        key={i.id}
                        className="flex flex-col gap-2 rounded-md border border-border/60 p-3 sm:flex-row sm:items-center sm:justify-between"
                      >
                        <div className="flex min-w-0 items-start gap-3">
                          <Checkbox
                            checked={i.concluido}
                            onCheckedChange={(v) =>
                              toggle.mutate({ id: i.id, concluido: v === true })
                            }
                            aria-label="Marcar sessão como concluída"
                            className="mt-0.5"
                          />
                          <div className="min-w-0">
                            <p
                              className={`truncate text-sm font-medium ${
                                i.concluido ? "text-muted-foreground line-through" : ""
                              }`}
                            >
                              {i.titulo}
                            </p>
                            {i.observacoes && (
                              <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
                                {i.observacoes}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="flex shrink-0 items-center gap-1">
                          {i.material_id && (
                            <Button asChild variant="outline" size="sm">
                              <Link
                                to="/materiais/$materialId/pdf"
                                params={{ materialId: i.material_id }}
                              >
                                <FileText className="mr-1 h-3.5 w-3.5" />
                                Abrir PDF
                              </Link>
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            aria-label="Editar sessão"
                            onClick={() => abrirEdicao(i)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            aria-label="Remover sessão"
                            onClick={() => remover.mutate(i.id)}
                            disabled={remover.isPending}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </div>
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
