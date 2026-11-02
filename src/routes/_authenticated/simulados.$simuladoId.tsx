import { Link, createFileRoute, useBlocker } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { ArrowLeft, ArrowRight, ClipboardCheck, Clock, Gauge, Loader2, Target } from "lucide-react";
import { Kpi } from "@/components/cronograma/visual";
import { PageContent, PageHeader, EmptyState } from "@/components/page";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { useSimuladoTempo } from "@/hooks/use-simulado-tempo";
import {
  alunoFinalizarSimulado,
  alunoLerSimulado,
  alunoResponderSimulado,
} from "@/lib/simulado-aluno.functions";

export const Route = createFileRoute("/_authenticated/simulados/$simuladoId")({
  head: () => ({ meta: [
    { title: "Simulado — Portal do Aluno | Instituto J&D" },
    { name: "description", content: "Responda seu simulado e acompanhe seu desempenho no Instituto J&D." },
    { property: "og:title", content: "Simulado | Instituto J&D" },
    { property: "og:description", content: "Avaliação de desempenho do aluno no Instituto J&D." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary_large_image" },
  ] }),
  component: SimuladoPage,
});

const META = 85;

function formatarRelogio(ms: number) {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function SimuladoPage() {
  const { simuladoId } = Route.useParams();
  const lerFn = useServerFn(alunoLerSimulado);
  const q = useQuery({
    queryKey: ["aluno", "simulado", simuladoId],
    queryFn: () => lerFn({ data: { simulado_id: simuladoId } }),
    refetchOnWindowFocus: false,
    staleTime: 0,
    gcTime: 0,
  });
  const d: any = q.data;

  return (
    <>
      <PageHeader
        icone={ClipboardCheck}
        rotulo="Avaliação do seu nível"
        title="Simulado"
        description="Sem comentários e sem gabarito: o objetivo é medir o seu nível."
        actions={
          <Button asChild variant="ghost">
            <Link to="/simulados">
              <ArrowLeft className="mr-1 h-4 w-4" />
              Simulados
            </Link>
          </Button>
        }
      />
      <PageContent>
        {q.isLoading ? (
          <div className="text-sm text-muted-foreground">Carregando…</div>
        ) : q.error ? (
          <EmptyState title="Simulado indisponível" description={(q.error as Error).message} />
        ) : d?.status === "concluido" ? (
          <Resultado r={d.resultado} />
        ) : d ? (
          <Prova simuladoId={simuladoId} dados={d} />
        ) : null}
      </PageContent>
    </>
  );
}

// ---------- fazendo a prova ----------

function Prova({ simuladoId, dados }: { simuladoId: string; dados: any }) {
  const qc = useQueryClient();
  const responderFn = useServerFn(alunoResponderSimulado);
  const finalizarFn = useServerFn(alunoFinalizarSimulado);
  const questoes: any[] = dados.questoes;

  const [atual, setAtual] = useState(() => Math.min(dados.questao_atual ?? 0, Math.max(0, questoes.length - 1)));
  const [marcadas, setMarcadas] = useState<Record<string, string | null>>(() =>
    Object.fromEntries(questoes.map((x) => [x.id, x.marcada])),
  );
  const [confirmar, setConfirmar] = useState(false);

  const { restante, salvarProgresso } = useSimuladoTempo(simuladoId, dados, atual, setAtual);
  const envios = useRef(new Set<Promise<unknown>>());
  useBlocker({
    enableBeforeUnload: false,
    shouldBlockFn: async () => {
      try {
        await Promise.all([...envios.current]);
        await salvarProgresso();
        return false;
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Não foi possível salvar suas respostas.");
        return true;
      }
    },
  });

  const finalizar = useMutation({
    mutationFn: async () => {
      await Promise.all([...envios.current]);
      await salvarProgresso();
      return finalizarFn({ data: { simulado_id: simuladoId } });
    },
    onSuccess: (resultado) => {
      qc.setQueryData(["aluno", "simulado", simuladoId], { status: "concluido", resultado });
      qc.invalidateQueries({ queryKey: ["aluno", "simulados"] });
      qc.invalidateQueries({ queryKey: ["aluno", "cronograma"] });
      setConfirmar(false);
    },
    onError: (e: any) => toast.error(e.message),
  });

  const disparou = useRef(false);
  useEffect(() => {
    if (restante <= 0 && !disparou.current) {
      disparou.current = true;
      toast.info("O tempo acabou. Encerrando o simulado…");
      finalizar.mutate();
    }
  }, [restante, finalizar]);

  const responder = useMutation({
    mutationFn: (v: { questao_id: string; alternativa_id: string | null }) =>
      responderFn({ data: { simulado_id: simuladoId, ...v } }),
    onError: (e: any) => toast.error(e.message),
  });

  const escolher = (questaoId: string, alternativaId: string) => {
    const anterior = marcadas[questaoId] ?? null;
    // Clicar de novo na mesma alternativa desmarca.
    const nova = anterior === alternativaId ? null : alternativaId;
    setMarcadas((m) => ({ ...m, [questaoId]: nova }));
    const envio = responder.mutateAsync({ questao_id: questaoId, alternativa_id: nova });
    envios.current.add(envio);
    void envio.catch(() => setMarcadas((m) => ({ ...m, [questaoId]: anterior })))
      .finally(() => envios.current.delete(envio));
  };

  const q = questoes[atual];
  const respondidas = useMemo(() => Object.values(marcadas).filter(Boolean).length, [marcadas]);
  const alerta = restante < 5 * 60_000;

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <div className="surface-card flex flex-wrap items-center justify-between gap-3 p-4">
        <p className="text-sm">
          Simulado {dados.numero} · <strong>{respondidas}</strong> de {questoes.length} respondidas
        </p>
        <p className={`flex items-center gap-2 text-sm font-semibold tabular-nums ${alerta ? "text-destructive" : ""}`}>
          <Clock className="h-4 w-4" />
          {formatarRelogio(restante)}
        </p>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {questoes.map((x, i) => (
          <Button
            key={x.id}
            type="button"
            variant="ghost"
            onClick={() => setAtual(i)}
            aria-label={`Questão ${i + 1}`}
            className={`h-8 w-8 rounded-md border p-0 text-xs tabular-nums ${
              i === atual
                ? "border-primary bg-primary text-primary-foreground"
                : marcadas[x.id]
                  ? "border-primary/40 bg-primary/10"
                  : "border-border/60"
            }`}
          >
            {i + 1}
          </Button>
        ))}
      </div>

      {q && (
        <section className="surface-card space-y-4 p-5">
          <div className="flex items-center justify-between gap-2">
            <Badge variant="outline">{q.disciplina || "Questão"}</Badge>
            <span className="text-xs text-muted-foreground">
              Questão {atual + 1} de {questoes.length}
            </span>
          </div>
          <p className="whitespace-pre-line text-sm leading-relaxed">{q.enunciado}</p>
          {q.referencia && <p className="text-xs text-muted-foreground">{q.referencia}</p>}
          <ul className="space-y-2">
            {q.alternativas.map((a: any) => {
              const marcada = marcadas[q.id] === a.id;
              return (
                <li key={a.id}>
                  <Button
                    type="button"
                    variant="ghost"
                    disabled={responder.isPending || finalizar.isPending}
                    onClick={() => escolher(q.id, a.id)}
                    aria-pressed={marcada}
                    className={`flex h-auto w-full items-start justify-start gap-3 whitespace-normal rounded-lg border p-3 text-left text-sm ${
                      marcada ? "border-primary bg-primary/5" : "border-border/60 hover:border-primary/40"
                    }`}
                  >
                    <span className="font-semibold">{a.letra})</span>
                    <span>{a.texto}</span>
                  </Button>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      <div className="flex items-center justify-between">
        <Button variant="outline" onClick={() => setAtual(Math.max(0, atual - 1))} disabled={atual === 0}>
          <ArrowLeft className="mr-1 h-4 w-4" />
          Anterior
        </Button>
        {atual < questoes.length - 1 ? (
          <Button onClick={() => setAtual(atual + 1)}>
            Próxima
            <ArrowRight className="ml-1 h-4 w-4" />
          </Button>
        ) : (
          <Button onClick={() => setConfirmar(true)}>Finalizar simulado</Button>
        )}
      </div>
      <div className="text-center">
        <Button variant="ghost" size="sm" onClick={() => setConfirmar(true)}>
          Finalizar agora
        </Button>
      </div>

      <Dialog open={confirmar} onOpenChange={setConfirmar}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Finalizar o simulado?</DialogTitle>
            <DialogDescription>
              {questoes.length - respondidas > 0
                ? `Você deixou ${questoes.length - respondidas} questão(ões) em branco; elas contam como erradas.`
                : "Você respondeu todas as questões."}{" "}
              Depois de finalizar não dá para alterar as respostas.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setConfirmar(false)}>
              Continuar
            </Button>
            <Button onClick={() => finalizar.mutate()} disabled={finalizar.isPending}>
              {finalizar.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Finalizar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ---------- resultado ----------

function Resultado({ r }: { r: any }) {
  const abaixo = r.por_disciplina.filter((i: any) => i.percentual < META);
  const faltaram = Object.values(r.faltaram ?? {}).reduce((a: number, b: any) => a + Number(b), 0);
  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <div className="grid gap-3 sm:grid-cols-3">
        <Numero rotulo="Acertos" valor={`${r.acertos} de ${r.total}`} />
        <Numero rotulo="Aproveitamento" valor={`${Number(r.percentual).toFixed(1)}%`} />
        <Numero rotulo="Nota ponderada pelos pesos" valor={`${Number(r.nota_ponderada).toFixed(1)}%`} destaque />
      </div>

      <section className="surface-card space-y-4 p-5">
        <h2 className="text-sm font-semibold">Desempenho por disciplina</h2>
        <ul className="space-y-3">
          {r.por_disciplina.map((i: any) => (
            <li key={i.disciplina_id} className="space-y-1">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium">{i.nome}</span>
                <span className={`tabular-nums ${i.percentual < META ? "text-destructive" : ""}`}>
                  {i.acertos}/{i.total} · {Math.round(i.percentual)}%
                </span>
              </div>
              <Progress value={i.percentual} className="h-1.5" />
              <p className="text-xs text-muted-foreground">
                Peso {i.peso}
                {i.total < i.pedidas && ` · a prova pede ${i.pedidas} questões, mas só havia ${i.total} cadastradas`}
              </p>
            </li>
          ))}
        </ul>
      </section>

      {abaixo.length > 0 ? (
        <p className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-4 text-sm">
          Abaixo de {META}%: {abaixo.map((i: any) => i.nome).join(", ")}. Essas disciplinas merecem atenção nas
          revisões do seu cronograma.
        </p>
      ) : (
        <p className="rounded-lg border border-primary/20 bg-primary/5 p-4 text-sm">
          Todas as disciplinas acima de {META}%. Continue no ritmo do seu cronograma.
        </p>
      )}
      {faltaram > 0 && (
        <p className="text-xs text-muted-foreground">
          Este simulado teve {faltaram} questão(ões) a menos que a prova real porque ainda não há questões
          suficientes cadastradas.
        </p>
      )}
      <Button asChild variant="outline">
        <Link to="/simulados">Voltar aos simulados</Link>
      </Button>
    </div>
  );
}

function Numero({ rotulo, valor, destaque }: { rotulo: string; valor: string; destaque?: boolean }) {
  return <Kpi icone={destaque ? Gauge : Target} rotulo={rotulo} valor={valor} destaque={destaque} />;
}
