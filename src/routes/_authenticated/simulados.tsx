import { Link, Outlet, createFileRoute, useChildMatches, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { CalendarDays, ClipboardCheck, Loader2, Lock } from "lucide-react";
import { PageContent, PageHeader, EmptyState } from "@/components/page";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { CheckoutSimulado } from "@/components/checkout-simulado";
import { formatarData } from "@/components/cronograma/formato";
import {
  alunoAtivarSimulados,
  alunoIniciarSimulado,
  alunoPainelSimulados,
} from "@/lib/simulado-aluno.functions";
import { iniciarCheckoutSimulado } from "@/lib/simulado-checkout";

export const Route = createFileRoute("/_authenticated/simulados")({
  head: () => ({
    meta: [
      { title: "Simulados — Portal do Aluno | Instituto J&D" },
      {
        name: "description",
        content:
          "Simulados quinzenais montados pela estrutura da prova do seu concurso, para medir o seu nível ao longo do cronograma.",
      },
    ],
  }),
  component: Simulados,
});

const META = 85;

/** `simulados.$simuladoId` é filha desta rota: quando há filha ativa, mostra a prova em vez da lista. */
function Simulados() {
  const filhas = useChildMatches();
  return filhas.length > 0 ? <Outlet /> : <PainelSimulados />;
}

function PainelSimulados() {
  const painelFn = useServerFn(alunoPainelSimulados);
  const q = useQuery({ queryKey: ["aluno", "simulados"], queryFn: () => painelFn() });
  const d = q.data;

  return (
    <>
      <PageHeader
        icone={ClipboardCheck}
        rotulo="Serviço J&D"
        title="Simulados"
        description="Um simulado a cada 15 dias, pela estrutura da prova do seu concurso. Sem comentários: servem para medir o seu nível."
      />
      <PageContent>
        {q.isLoading ? (
          <div className="text-sm text-muted-foreground">Carregando…</div>
        ) : q.error ? (
          <EmptyState icon={ClipboardCheck} title="Simulados indisponíveis" description={(q.error as Error).message} />
        ) : !d?.cronograma ? (
          <EmptyState
            icon={CalendarDays}
            title="Monte um cronograma primeiro"
            description="Os simulados fazem parte do seu cronograma de estudos, a partir da data em que você começa."
          />
        ) : !d.cronograma.usa_simulado || d.simulados.length === 0 ? (
          <Contratar painel={d} />
        ) : (
          <Lista painel={d} />
        )}
      </PageContent>
    </>
  );
}

// ---------- incluir/contratar ----------

function Contratar({ painel }: { painel: any }) {
  const qc = useQueryClient();
  const ativarFn = useServerFn(alunoAtivarSimulados);
  const [horas, setHoras] = useState(String(Math.floor((painel.cronograma.duracao_prova_min ?? 240) / 60)));
  const [minutos, setMinutos] = useState(String((painel.cronograma.duracao_prova_min ?? 240) % 60));
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const duracao = (Number(horas) || 0) * 60 + (Number(minutos) || 0);

  const ativar = useMutation({
    mutationFn: () => ativarFn({ data: { duracao_prova_min: duracao } }),
    onSuccess: async (r: any) => {
      if (r.estado === "ativo") {
        toast.success("Simulados incluídos no seu cronograma.");
        qc.invalidateQueries({ queryKey: ["aluno"] });
        return;
      }
      try {
        const sessao = await iniciarCheckoutSimulado(r.data_prova);
        setClientSecret(sessao.clientSecret);
      } catch (e: any) {
        toast.error(e.message ?? "Não foi possível abrir o pagamento.");
      }
    },
    onError: (e: any) => toast.error(e.message),
  });

  if (clientSecret) {
    return (
      <div className="mx-auto max-w-3xl space-y-4">
        <div className="surface-card p-5">
          <h2 className="text-base font-semibold">Pagamento dos simulados</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Assim que o pagamento for confirmado, os simulados entram no seu cronograma. O acesso vale até o dia da
            prova.
          </p>
        </div>
        <div className="surface-card p-4">
          <CheckoutSimulado clientSecret={clientSecret} />
        </div>
      </div>
    );
  }

  return (
    <div className="surface-card mx-auto max-w-2xl space-y-5 p-6">
      <div className="flex items-start gap-3">
        <Lock className="mt-0.5 h-5 w-5 text-muted-foreground" />
        <div>
          <h2 className="text-base font-semibold">Inclua os simulados no seu cronograma</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Um simulado a cada 15 dias, montado pela estrutura da prova de <strong>{painel.cronograma.concurso_nome}</strong>,
            com questões das matérias e sem comentário, para você enxergar o seu nível. O tempo de cada simulado é
            reservado no seu plano.
          </p>
          <p className="mt-2 text-sm">
            {painel.liberado ? (
              <Badge variant="secondary">Acesso liberado</Badge>
            ) : (
              <>
                <strong>R$ 97,00</strong>, pagamento único, válido para este cronograma até o dia da prova (
                {formatarData(painel.cronograma.data_prova)}).
              </>
            )}
          </p>
        </div>
      </div>
      <div className="space-y-1.5">
        <Label>Duração da prova no edital</Label>
        <div className="flex items-center gap-2">
          <Input inputMode="numeric" className="w-20" value={horas} onChange={(e) => setHoras(e.target.value)} aria-label="Horas" />
          <span className="text-sm text-muted-foreground">h</span>
          <Input inputMode="numeric" className="w-20" value={minutos} onChange={(e) => setMinutos(e.target.value)} aria-label="Minutos" />
          <span className="text-sm text-muted-foreground">min</span>
        </div>
      </div>
      <Button onClick={() => ativar.mutate()} disabled={ativar.isPending || duracao < 10}>
        {ativar.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        {painel.liberado ? "Incluir no meu cronograma" : "Contratar e incluir no cronograma"}
      </Button>
    </div>
  );
}

// ---------- lista dos simulados do cronograma ----------

const ROTULO: Record<string, string> = {
  futuro: "Agendado",
  disponivel: "Disponível hoje",
  atrasado: "Disponível",
  em_andamento: "Em andamento",
  concluido: "Concluído",
};

function Lista({ painel }: { painel: any }) {
  const navigate = useNavigate();
  const iniciarFn = useServerFn(alunoIniciarSimulado);
  const iniciar = useMutation({
    mutationFn: (blocoId: string) => iniciarFn({ data: { bloco_id: blocoId } }),
    onSuccess: (r: any) => navigate({ to: "/simulados/$simuladoId", params: { simuladoId: r.simulado_id } }),
    onError: (e: any) => toast.error(e.message),
  });

  const concluidos = painel.simulados.filter((s: any) => s.estado === "concluido");
  return (
    <div className="mx-auto max-w-3xl space-y-4">
      {!painel.liberado && (
        <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-4 text-sm">
          O seu acesso aos simulados expirou. Os resultados anteriores continuam abaixo.
        </div>
      )}
      <p className="text-sm text-muted-foreground">
        Prova de {painel.cronograma.duracao_prova_min} min · {concluidos.length} de {painel.simulados.length} feito(s)
        {concluidos.length > 0 &&
          ` · última nota ponderada: ${concluidos[concluidos.length - 1].nota_ponderada?.toFixed(1)}%`}
      </p>
      {painel.simulados.map((s: any) => {
        const itens: any[] = s.por_disciplina?.itens ?? [];
        return (
          <section key={s.bloco_id} className="surface-card space-y-3 p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-sm font-semibold">Simulado {s.numero}</h2>
                <p className="text-xs text-muted-foreground">Previsto para {formatarData(s.data)}</p>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={s.estado === "concluido" ? "secondary" : "outline"}>{ROTULO[s.estado]}</Badge>
                {s.estado === "futuro" ? (
                  <span className="text-xs text-muted-foreground">Abre em {formatarData(s.data)}</span>
                ) : s.estado === "concluido" ? (
                  <Button asChild size="sm" variant="outline">
                    <Link to="/simulados/$simuladoId" params={{ simuladoId: s.simulado_id }}>
                      Ver resultado
                    </Link>
                  </Button>
                ) : painel.liberado ? (
                  <Button size="sm" onClick={() => iniciar.mutate(s.bloco_id)} disabled={iniciar.isPending}>
                    {s.estado === "em_andamento" ? "Continuar" : "Iniciar"}
                  </Button>
                ) : null}
              </div>
            </div>
            {s.estado === "concluido" && (
              <>
                <p className="text-sm">
                  <strong>{s.acertos}</strong> de {s.total} · {s.percentual?.toFixed(1)}% · nota ponderada{" "}
                  <strong>{s.nota_ponderada?.toFixed(1)}%</strong>
                </p>
                <ul className="space-y-2">
                  {itens.map((i) => (
                    <li key={i.disciplina_id} className="flex items-center gap-3 text-xs">
                      <span className="w-48 shrink-0 truncate">{i.nome}</span>
                      <Progress value={i.percentual} className="h-1.5" />
                      <span className={`w-12 shrink-0 text-right tabular-nums ${i.percentual < META ? "text-destructive" : ""}`}>
                        {Math.round(i.percentual)}%
                      </span>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </section>
        );
      })}
    </div>
  );
}
