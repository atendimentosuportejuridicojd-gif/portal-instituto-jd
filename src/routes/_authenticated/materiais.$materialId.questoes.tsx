import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMaterialNavegacao } from "@/hooks/use-material-navegacao";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { PageContent, PageHeader, EmptyState } from "@/components/page";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { HelpCircle, Check, X, ChevronRight, Scissors, Gavel } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { criarRecurso, TIPOS_RECURSO } from "@/lib/recursos.functions";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  iniciarOuRetomarSessao,
  getSessaoAtual,
  responderQuestao,
} from "@/lib/questoes.functions";

export const Route = createFileRoute("/_authenticated/materiais/$materialId/questoes")({
  head: () => ({ meta: [{ title: "Resolver questões — Portal J&D" }] }),
  component: Resolver,
});

function Resolver() {
  const { materialId } = Route.useParams();
  const navigate = useNavigate();
  const nav = useMaterialNavegacao(materialId);
  const iniciar = useServerFn(iniciarOuRetomarSessao);
  const carregar = useServerFn(getSessaoAtual);
  const responder = useServerFn(responderQuestao);
  const enviarRecurso = useServerFn(criarRecurso);

  const [sessaoId, setSessaoId] = useState<string | null>(null);
  const [state, setState] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [riscadas, setRiscadas] = useState<string[]>([]);
  const [feedback, setFeedback] = useState<null | {
    acertou: boolean;
    correta_id: string | null;
    comentario: string | null;
  }>(null);
  const [submitting, setSubmitting] = useState(false);
  const [idx, setIdx] = useState(0);
  const [finalizada, setFinalizada] = useState(false);
  const [recursoOpen, setRecursoOpen] = useState(false);
  const [recursoTipo, setRecursoTipo] = useState<keyof typeof TIPOS_RECURSO>("alteracao_gabarito");
  const [recursoTexto, setRecursoTexto] = useState("");
  const [enviandoRecurso, setEnviandoRecurso] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const { sessaoId } = await iniciar({ data: { material_id: materialId } });
        setSessaoId(sessaoId);
        const s = await carregar({ data: { sessao_id: sessaoId } });
        setState(s);
        const first = s.questoes.findIndex((q: any) => !q.respondida);
        setIdx(first === -1 ? s.questoes.length : first);
      } catch (e: any) {
        setErro(e.message ?? "Erro ao carregar.");
      } finally {
        setLoading(false);
      }
    })();
  }, [materialId]);

  if (loading) {
    return <PageContent><div className="text-sm text-muted-foreground">Carregando…</div></PageContent>;
  }

  if (erro) {
    return (
      <>
        <PageHeader title="Questões" />
        <PageContent>
          <EmptyState icon={HelpCircle} title="Não foi possível iniciar" description={erro} />
          <div className="mt-4 flex justify-center">
            <Button asChild variant="outline">
              <Link to="/acervo">Voltar ao acervo</Link>
            </Button>
          </div>
        </PageContent>
      </>
    );
  }

  if (!state) return null;

  const total = state.questoes.length;
  const respondidasCount = state.questoes.filter((q: any) => q.respondida).length;
  const currentIdx = idx;
  const current = currentIdx >= total ? null : state.questoes[currentIdx];
  const progresso = total === 0 ? 0 : Math.round((respondidasCount / total) * 100);

  async function submitResposta() {
    if (!current || !selected || !sessaoId) return;
    setSubmitting(true);
    try {
      const r = await responder({
        data: { sessao_id: sessaoId, questao_id: current.id, alternativa_id: selected },
      });
      setFeedback({ acertou: r.acertou, correta_id: r.correta_id, comentario: r.comentario });
      // Refresh state to mark this question answered (stay on the same question)
      const s = await carregar({ data: { sessao_id: sessaoId } });
      setState(s);
      if (r.finalizada) {
        setFinalizada(true);
        toast.success(`Tentativa concluída — ${r.resumo?.percentual}%`);
      }
    } catch (e: any) {
      toast.error(e.message ?? "Erro ao responder.");
    } finally {
      setSubmitting(false);
    }
  }

  function proxima() {
    setFeedback(null);
    setSelected(null);
    setRiscadas([]);
    if (finalizada) {
      navigate({ to: "/materiais/$materialId/desempenho", params: { materialId } });
      return;
    }
    const next = state.questoes.findIndex((q: any, i: number) => i > currentIdx && !q.respondida);
    setIdx(next === -1 ? total : next);
  }


  if (total === 0) {
    return (
      <>
        <PageHeader title="Questões" description={state.sessao.material} />
        <PageContent>
          <EmptyState
            icon={HelpCircle}
            title="Sem questões"
            description="Este material ainda não possui questões cadastradas."
          />
        </PageContent>
      </>
    );
  }

  if (!current) {
    return (
      <>
        <PageHeader title="Tentativa concluída" description={state.sessao.material} />
        <PageContent>
          <div className="surface-card p-8 text-center">
            <p className="text-sm text-muted-foreground">Você respondeu todas as questões desta tentativa.</p>
            <div className="mt-4 flex flex-wrap justify-center gap-2">
              <Button
                onClick={() =>
                  navigate({ to: "/materiais/$materialId/desempenho", params: { materialId } })
                }
              >
                Ver desempenho
              </Button>
              {nav.disciplinaId && (
                <Button asChild variant="outline">
                  <Link
                    to="/acervo/$cargoId/$disciplinaId"
                    params={{ cargoId: "todos", disciplinaId: nav.disciplinaId }}
                  >
                    Voltar para a disciplina
                  </Link>
                </Button>
              )}
              {nav.proxima && (
                <Button asChild variant="secondary">
                  <Link to="/materiais/$materialId/pdf" params={{ materialId: nav.proxima.id }}>
                    Próxima matéria
                    <ChevronRight className="ml-1 h-4 w-4" />
                  </Link>
                </Button>
              )}
            </div>
          </div>
        </PageContent>
      </>
    );
  }

  const respondendo = feedback === null;

  return (
    <>
      <div className="border-b border-border/60 px-6 py-6 sm:px-8">
        <div className="text-xs uppercase tracking-wider text-muted-foreground">
          {state.sessao.disciplina}
        </div>
        <h1 className="mt-1 text-xl font-semibold">{state.sessao.material}</h1>
        <div className="mt-4 flex items-center gap-4">
          <div className="text-sm font-medium">
            Questão {String(currentIdx + 1).padStart(2, "0")} de {String(total).padStart(2, "0")}
          </div>
          <Progress value={progresso} className="h-2 flex-1" />
          <div className="text-xs tabular-nums text-muted-foreground">{progresso}%</div>
        </div>
      </div>

      <PageContent>
        <div className="mx-auto max-w-3xl space-y-6">
          <div className="surface-card p-6">
            <div className="mb-3 flex items-start justify-between gap-3">
              <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                {current.referencia}
              </div>
              <Button
                size="sm"
                variant="outline"
                className="shrink-0"
                onClick={() => {
                  setRecursoTipo("alteracao_gabarito");
                  setRecursoTexto("");
                  setRecursoOpen(true);
                }}
              >
                <Gavel className="mr-2 h-4 w-4" />
                Criar recurso
              </Button>
            </div>
            <p className="whitespace-pre-wrap text-[15px] leading-relaxed">{current.enunciado}</p>

            <div className="mt-6 space-y-2">
              {current.alternativas.map((a: any) => {
                const isSelected = selected === a.id;
                const isCorrect = feedback && feedback.correta_id === a.id;
                const isWrongPick = feedback && !feedback.acertou && isSelected;
                const cortada = riscadas.includes(a.id);
                return (
                  <div key={a.id} className="flex items-start gap-2">
                    <button
                      type="button"
                      disabled={!respondendo}
                      onClick={() => {
                        if (cortada) return;
                        setSelected(a.id);
                      }}
                      className={cn(
                        "flex min-w-0 flex-1 items-start gap-3 rounded-md border p-3 text-left text-sm transition-colors",
                        respondendo && !cortada && "hover:border-primary/50",
                        !respondendo && "cursor-default opacity-90",
                        cortada && "opacity-45",
                        isSelected && respondendo && !cortada && "border-primary bg-primary/5",
                        isCorrect && "border-green-500/60 bg-green-500/10",
                        isWrongPick && "border-red-500/60 bg-red-500/10",
                      )}
                    >
                      <div
                        className={cn(
                          "grid h-6 w-6 shrink-0 place-items-center rounded-full border text-xs font-semibold",
                          isSelected && respondendo && !cortada && "border-primary bg-primary text-primary-foreground",
                          isCorrect && "border-green-500 bg-green-500 text-white",
                          isWrongPick && "border-red-500 bg-red-500 text-white",
                        )}
                      >
                        {a.letra}
                      </div>
                      <div
                        className={cn(
                          "min-w-0 flex-1 whitespace-pre-wrap",
                          cortada && "line-through decoration-2",
                        )}
                      >
                        {a.texto}
                      </div>
                      {isCorrect && <Check className="h-4 w-4 shrink-0 text-green-600" />}
                      {isWrongPick && <X className="h-4 w-4 shrink-0 text-red-600" />}
                    </button>
                    {respondendo && (
                      <button
                        type="button"
                        aria-label={cortada ? `Desfazer corte da alternativa ${a.letra}` : `Cortar alternativa ${a.letra}`}
                        title={cortada ? "Desfazer corte" : "Cortar alternativa"}
                        onClick={() =>
                          setRiscadas((prev) => {
                            const next = prev.includes(a.id)
                              ? prev.filter((id) => id !== a.id)
                              : [...prev, a.id];
                            if (!prev.includes(a.id) && selected === a.id) setSelected(null);
                            return next;
                          })
                        }
                        className={cn(
                          "mt-1 grid h-8 w-8 shrink-0 place-items-center rounded-md border text-muted-foreground transition-colors hover:bg-muted",
                          cortada && "border-primary/60 bg-primary/10 text-primary",
                        )}
                      >
                        <Scissors className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>

            {feedback && (
              <div className="mt-5 space-y-3">
                <div
                  className={cn(
                    "flex items-center gap-2 rounded-md p-3 text-sm font-medium",
                    feedback.acertou
                      ? "bg-green-500/10 text-green-700 dark:text-green-400"
                      : "bg-red-500/10 text-red-700 dark:text-red-400",
                  )}
                >
                  {feedback.acertou ? <Check className="h-4 w-4" /> : <X className="h-4 w-4" />}
                  {feedback.acertou ? "Resposta correta" : "Resposta incorreta"}
                </div>
                {feedback.comentario && (
                  <div className="rounded-md border border-border/60 bg-muted/30 p-4">
                    <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                      Comentário do professor
                    </div>
                    <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed">{feedback.comentario}</p>
                  </div>
                )}
              </div>
            )}

            <div className="mt-6 flex justify-end">
              {respondendo ? (
                <Button onClick={submitResposta} disabled={!selected || submitting}>
                  {submitting ? "Enviando…" : "Responder"}
                </Button>
              ) : (
                <Button onClick={proxima}>
                  {finalizada ? "Ver desempenho" : "Próxima questão"}
                  <ChevronRight className="ml-1 h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        </div>
      </PageContent>

      <Dialog open={recursoOpen} onOpenChange={setRecursoOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Criar recurso</DialogTitle>
            <DialogDescription>
              Escolha o tipo de pedido e apresente os fundamentos. O administrador será avisado para avaliar.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Tipo de recurso</Label>
              <RadioGroup
                value={recursoTipo}
                onValueChange={(v) => setRecursoTipo(v as keyof typeof TIPOS_RECURSO)}
                className="mt-2 space-y-2"
              >
                {(Object.keys(TIPOS_RECURSO) as Array<keyof typeof TIPOS_RECURSO>).map((k) => (
                  <div key={k} className="flex items-center gap-2">
                    <RadioGroupItem value={k} id={`recurso-${k}`} />
                    <Label htmlFor={`recurso-${k}`} className="cursor-pointer font-normal">
                      {TIPOS_RECURSO[k]}
                    </Label>
                  </div>
                ))}
              </RadioGroup>
            </div>
            <div>
              <Label htmlFor="recurso-fund">Fundamentação</Label>
              <Textarea
                id="recurso-fund"
                rows={6}
                maxLength={3000}
                className="mt-1"
                placeholder="Explique, de forma objetiva, os fundamentos do seu pedido (mínimo de 20 caracteres)."
                value={recursoTexto}
                onChange={(e) => setRecursoTexto(e.target.value)}
              />
              <p className="mt-1 text-xs text-muted-foreground">{recursoTexto.trim().length}/3000</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setRecursoOpen(false)}>
              Cancelar
            </Button>
            <Button
              disabled={enviandoRecurso || recursoTexto.trim().length < 20}
              onClick={async () => {
                if (!current) return;
                setEnviandoRecurso(true);
                try {
                  await enviarRecurso({
                    data: {
                      questao_id: current.id,
                      material_id: materialId,
                      tipo: recursoTipo,
                      fundamentacao: recursoTexto.trim(),
                    },
                  });
                  toast.success("Recurso enviado para análise.");
                  setRecursoOpen(false);
                  setRecursoTexto("");
                } catch (e: any) {
                  toast.error(e.message ?? "Erro ao enviar o recurso.");
                } finally {
                  setEnviandoRecurso(false);
                }
              }}
            >
              {enviandoRecurso ? "Enviando…" : "Enviar recurso"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
