import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { PageContent, PageHeader, EmptyState } from "@/components/page";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Badge } from "@/components/ui/badge";
import { HelpCircle, Plus, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  adminListMateriaisComQuestoes,
  adminListQuestoesPorMaterial,
  adminUpsertQuestao,
  adminDeleteQuestao,
} from "@/lib/questoes.functions";

export const Route = createFileRoute("/_authenticated/admin/questoes")({
  head: () => ({ meta: [{ title: "Questões — Admin J&D" }] }),
  component: AdminQuestoes,
});

type Letra = "A" | "B" | "C" | "D" | "E";
const LETRAS: Letra[] = ["A", "B", "C", "D", "E"];

function AdminQuestoes() {
  const router = useRouter();
  const listMateriais = useServerFn(adminListMateriaisComQuestoes);
  const listQuestoes = useServerFn(adminListQuestoesPorMaterial);
  const upsert = useServerFn(adminUpsertQuestao);
  const remove = useServerFn(adminDeleteQuestao);

  const [selectedMat, setSelectedMat] = useState<string | null>(null);
  const [editing, setEditing] = useState<any | null>(null);
  const [open, setOpen] = useState(false);

  const matsQ = useQuery({
    queryKey: ["admin", "materiais-questoes"],
    queryFn: () => listMateriais(),
  });

  const questoesQ = useQuery({
    enabled: !!selectedMat,
    queryKey: ["admin", "questoes", selectedMat],
    queryFn: () => listQuestoes({ data: { material_id: selectedMat! } }),
  });

  const materiais = matsQ.data ?? [];

  function openNew() {
    if (!selectedMat) {
      toast.error("Selecione um material primeiro.");
      return;
    }
    setEditing({
      material_id: selectedMat,
      referencia: "",
      enunciado: "",
      comentario_professor: "",
      alternativas: LETRAS.map((l) => ({ letra: l, texto: "" })),
      correta: "A" as Letra,
    });
    setOpen(true);
  }

  function openEdit(q: any) {
    const alts = LETRAS.map((l) => {
      const found = q.questao_alternativas?.find((a: any) => a.letra === l);
      return { letra: l, texto: found?.texto ?? "" };
    });
    const correta = (q.questao_alternativas?.find((a: any) => a.correta)?.letra ?? "A") as Letra;
    setEditing({
      id: q.id,
      material_id: selectedMat,
      referencia: q.referencia ?? "",
      enunciado: q.enunciado ?? "",
      comentario_professor: q.comentario_professor ?? "",
      alternativas: alts,
      correta,
    });
    setOpen(true);
  }

  async function submit() {
    if (!editing) return;
    try {
      await upsert({
        data: {
          id: editing.id,
          material_id: editing.material_id,
          referencia: editing.referencia,
          enunciado: editing.enunciado,
          comentario_professor: editing.comentario_professor ?? "",
          ordem: 0,
          publicado: true,
          alternativas: editing.alternativas,
          correta: editing.correta,
        },
      });
      toast.success("Questão salva.");
      setOpen(false);
      setEditing(null);
      questoesQ.refetch();
      matsQ.refetch();
      router.invalidate();
    } catch (e: any) {
      toast.error(e.message ?? "Erro ao salvar.");
    }
  }

  async function del(id: string) {
    if (!confirm("Excluir esta questão? Esta ação não pode ser desfeita.")) return;
    try {
      await remove({ data: { id } });
      toast.success("Questão excluída.");
      questoesQ.refetch();
      matsQ.refetch();
    } catch (e: any) {
      toast.error(e.message ?? "Erro ao excluir.");
    }
  }

  return (
    <>
      <PageHeader
        title="Questões"
        description="Cadastre e organize as questões vinculadas aos materiais."
        actions={
          <Button onClick={openNew} disabled={!selectedMat}>
            <Plus className="mr-2 h-4 w-4" />
            Nova questão
          </Button>
        }
      />
      <PageContent>
        {materiais.length === 0 ? (
          <EmptyState
            icon={HelpCircle}
            title="Nenhum material cadastrado"
            description="Cadastre materiais no Acervo para começar a criar questões."
          />
        ) : (
          <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
            <div className="surface-card p-3">
              <div className="mb-2 px-2 py-1 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Materiais
              </div>
              <div className="max-h-[600px] space-y-1 overflow-y-auto">
                {materiais.map((m: any) => (
                  <button
                    key={m.id}
                    onClick={() => setSelectedMat(m.id)}
                    className={`flex w-full items-start justify-between gap-2 rounded-md px-3 py-2 text-left text-sm transition-colors ${
                      selectedMat === m.id
                        ? "bg-primary/10 text-primary"
                        : "hover:bg-muted"
                    }`}
                  >
                    <div className="min-w-0">
                      <div className="truncate font-medium">{m.titulo}</div>
                      <div className="truncate text-xs text-muted-foreground">{m.disciplina}</div>
                    </div>
                    <Badge variant="secondary" className="shrink-0">
                      {m.total_questoes}
                    </Badge>
                  </button>
                ))}
              </div>
            </div>
            <div className="min-w-0">
              {!selectedMat ? (
                <EmptyState
                  icon={HelpCircle}
                  title="Selecione um material"
                  description="Escolha um material à esquerda para gerenciar suas questões."
                />
              ) : (questoesQ.data ?? []).length === 0 ? (
                <EmptyState
                  icon={HelpCircle}
                  title="Nenhuma questão"
                  description="Clique em Nova questão para começar."
                />
              ) : (
                <div className="space-y-3">
                  {(questoesQ.data ?? []).map((q: any, i: number) => {
                    const correta = q.questao_alternativas?.find((a: any) => a.correta);
                    return (
                      <div key={q.id} className="surface-card p-5">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0 flex-1">
                            <div className="text-xs text-muted-foreground">
                              Questão {String(i + 1).padStart(2, "0")} · {q.referencia || "Sem referência"}
                            </div>
                            <p className="mt-2 whitespace-pre-wrap text-sm">{q.enunciado}</p>
                            <div className="mt-3 flex flex-wrap gap-1">
                              <Badge variant="outline">Correta: {correta?.letra ?? "—"}</Badge>
                              <Badge variant="outline">{q.questao_alternativas?.length ?? 0} alternativas</Badge>
                            </div>
                          </div>
                          <div className="flex shrink-0 gap-1">
                            <Button size="icon" variant="ghost" onClick={() => openEdit(q)}>
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button size="icon" variant="ghost" onClick={() => del(q.id)}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}
      </PageContent>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing?.id ? "Editar questão" : "Nova questão"}</DialogTitle>
          </DialogHeader>
          {editing && (
            <div className="space-y-5">
              <div>
                <Label>Material relacionado</Label>
                <Select
                  value={editing.material_id}
                  onValueChange={(v) => setEditing({ ...editing, material_id: v })}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {materiais.map((m: any) => (
                      <SelectItem key={m.id} value={m.id}>
                        {m.disciplina} — {m.titulo}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Referência da questão</Label>
                <Input
                  placeholder="Ex.: FGV 2024 | TJSC | Técnico Judiciário | Questão 28"
                  value={editing.referencia}
                  onChange={(e) => setEditing({ ...editing, referencia: e.target.value })}
                />
              </div>
              <div>
                <Label>Enunciado</Label>
                <Textarea
                  rows={4}
                  value={editing.enunciado}
                  onChange={(e) => setEditing({ ...editing, enunciado: e.target.value })}
                />
              </div>
              <div className="space-y-3">
                <Label>Alternativas</Label>
                {editing.alternativas.map((a: any, i: number) => (
                  <div key={a.letra} className="flex items-start gap-2">
                    <div className="mt-2 w-8 shrink-0 text-sm font-semibold">{a.letra})</div>
                    <Textarea
                      rows={2}
                      value={a.texto}
                      onChange={(e) => {
                        const next = [...editing.alternativas];
                        next[i] = { ...next[i], texto: e.target.value };
                        setEditing({ ...editing, alternativas: next });
                      }}
                    />
                  </div>
                ))}
              </div>
              <div>
                <Label>Resposta correta</Label>
                <RadioGroup
                  value={editing.correta}
                  onValueChange={(v) => setEditing({ ...editing, correta: v as Letra })}
                  className="flex gap-4"
                >
                  {LETRAS.map((l) => (
                    <div key={l} className="flex items-center gap-2">
                      <RadioGroupItem value={l} id={`correta-${l}`} />
                      <Label htmlFor={`correta-${l}`} className="cursor-pointer">{l}</Label>
                    </div>
                  ))}
                </RadioGroup>
              </div>
              <div>
                <Label>Comentário do professor</Label>
                <Textarea
                  rows={4}
                  placeholder="Explicação exibida ao aluno após responder."
                  value={editing.comentario_professor}
                  onChange={(e) => setEditing({ ...editing, comentario_professor: e.target.value })}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={submit}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
