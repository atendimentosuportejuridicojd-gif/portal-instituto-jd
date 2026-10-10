import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  AlertTriangle,
  CalendarClock,
  CalendarDays,
  Check,
  ClipboardCheck,
  Clock,
  Gauge,
  GripVertical,
  Hourglass,
  Landmark,
  ListOrdered,
  Loader2,
  Timer,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { CheckoutSimulado } from "@/components/checkout-simulado";
import { alunoCriarCronograma, alunoPreviaCronograma } from "@/lib/cronograma-aluno.functions";
import { iniciarCheckoutSimulado } from "@/lib/simulado-checkout";
import { diferencaDias, somarDias } from "@/lib/cronograma-motor";
import { cn } from "@/lib/utils";
import { formatarData, formatarMinutos } from "./formato";
import { corDisciplina, Kpi, ListaArrastavel, Passos } from "./visual";

export type DadosAssistente = {
  hoje: string;
  simuladoLiberado: boolean;
  concursos: {
    id: string;
    nome: string;
    orgao: string | null;
    banca: string | null;
    estado: string | null;
    ano: number | null;
    data_prova: string | null;
    pronto: boolean;
  }[];
};

// Índice = dia da semana do JavaScript (0 = domingo).
const DIAS = [
  { i: 1, rotulo: "Seg", nome: "segunda" },
  { i: 2, rotulo: "Ter", nome: "terça" },
  { i: 3, rotulo: "Qua", nome: "quarta" },
  { i: 4, rotulo: "Qui", nome: "quinta" },
  { i: 5, rotulo: "Sex", nome: "sexta" },
  { i: 6, rotulo: "Sáb", nome: "sábado" },
  { i: 0, rotulo: "Dom", nome: "domingo" },
];

const PASSOS = ["Concurso", "Seu tempo", "Simulados", "Revisão do plano"];
const ATALHOS_HORAS = ["1", "2", "3", "4", "5", "6"];
const ATALHOS_QUESTAO = ["2", "3", "4", "5"];

const TITULOS = [
  { icone: Landmark, titulo: "Para qual concurso você vai estudar?", texto: "O plano usa as disciplinas da prova e termina um dia antes dela." },
  { icone: Clock, titulo: "Quanto tempo você tem para estudar?", texto: "Sem horário fixo: o plano só organiza o que fazer em cada dia." },
  { icone: ClipboardCheck, titulo: "Simulados no seu cronograma", texto: "Opcional: um simulado a cada 15 dias para medir o seu nível." },
  { icone: ListOrdered, titulo: "Revise o seu plano", texto: "Arraste as disciplinas para mudar a ordem. Você estuda uma por vez, na sequência." },
];

function Pilula({
  ativo,
  onClick,
  children,
  className,
  ...resto
}: {
  ativo: boolean;
  onClick: () => void;
  children: React.ReactNode;
  className?: string;
} & Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "onClick">) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-full border px-3.5 py-1.5 text-sm font-medium transition-all",
        ativo
          ? "border-primary bg-primary text-primary-foreground shadow-sm"
          : "border-border bg-background text-foreground hover:border-primary/50 hover:bg-accent",
        className,
      )}
      {...resto}
    >
      {children}
    </button>
  );
}

export function Assistente({
  dados,
  rascunho,
  onCriado,
  onCancelar,
}: {
  dados: DadosAssistente;
  rascunho: { concurso_nome: string } | null;
  onCriado: () => void;
  onCancelar?: () => void;
}) {
  const qc = useQueryClient();
  const previaFn = useServerFn(alunoPreviaCronograma);
  const criarFn = useServerFn(alunoCriarCronograma);

  const [passo, setPasso] = useState(0);
  const [concursoId, setConcursoId] = useState("");
  const [dataProva, setDataProva] = useState("");
  const [dataInicio, setDataInicio] = useState(dados.hoje);
  const [horas, setHoras] = useState("3");
  const [dias, setDias] = useState<Record<number, boolean>>({ 0: false, 1: true, 2: true, 3: true, 4: true, 5: true, 6: true });
  const [minQuestao, setMinQuestao] = useState("3");
  const [usaSimulado, setUsaSimulado] = useState(false);
  const [duracaoH, setDuracaoH] = useState("4");
  const [duracaoM, setDuracaoM] = useState("0");
  const [ordem, setOrdem] = useState<string[]>([]);
  const [clientSecret, setClientSecret] = useState<string | null>(null);

  const concurso = dados.concursos.find((c) => c.id === concursoId);
  const minutosDia = Math.round(Number(String(horas).replace(",", ".")) * 60);
  const duracaoProva = (Number(duracaoH) || 0) * 60 + (Number(duracaoM) || 0);
  const simuladoPendente = usaSimulado && !dados.simuladoLiberado;
  const diasMarcados = Object.values(dias).filter(Boolean).length;

  const parametros = useMemo(
    () => ({
      concurso_id: concursoId,
      data_inicio: dataInicio,
      data_prova: dataProva,
      minutos_por_dia: [0, 1, 2, 3, 4, 5, 6].map((i) => (dias[i] ? minutosDia : 0)),
      minutos_por_questao: Math.round(Number(minQuestao)) || 3,
      ordem_disciplinas: ordem.length ? ordem : undefined,
      usa_simulado: usaSimulado,
      duracao_prova_min: usaSimulado ? duracaoProva : null,
    }),
    [concursoId, dataInicio, dataProva, dias, minutosDia, minQuestao, ordem, usaSimulado, duracaoProva],
  );

  const previa = useMutation({
    mutationFn: () => previaFn({ data: parametros }),
    onError: (e: any) => toast.error(e.message),
  });

  // Ao chegar no último passo (e a cada troca de ordem), recalcula a prévia.
  useEffect(() => {
    if (passo === 3) previa.mutate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [passo, ordem.join(",")]);

  useEffect(() => {
    if (previa.data && ordem.length === 0) setOrdem(previa.data.disciplinas.map((d: any) => d.id));
  }, [previa.data, ordem.length]);

  const criar = useMutation({
    mutationFn: () => criarFn({ data: parametros }),
    onSuccess: async (r: any) => {
      qc.invalidateQueries({ queryKey: ["aluno", "cronograma"] });
      if (r.status === "ativo") {
        toast.success("Cronograma criado!");
        onCriado();
        return;
      }
      try {
        const sessao = await iniciarCheckoutSimulado(dataProva);
        setClientSecret(sessao.clientSecret);
      } catch (e: any) {
        toast.error(e.message ?? "Não foi possível abrir o pagamento.");
      }
    },
    onError: (e: any) => toast.error(e.message),
  });

  // ---------- validação por passo ----------
  const erroPasso = (p: number): string | null => {
    if (p === 0) {
      if (!concurso) return "Escolha o concurso.";
      if (!dataProva) return "Informe a data da prova.";
      if (dataProva <= dados.hoje) return "A data da prova precisa estar no futuro.";
    }
    if (p === 1) {
      if (dataInicio < dados.hoje) return "A data de início não pode estar no passado.";
      if (dataInicio >= dataProva) return "O início precisa ser antes da prova.";
      if (!(minutosDia > 0) || minutosDia > 1440) return "Informe as horas de estudo por dia.";
      if (!diasMarcados) return "Marque pelo menos um dia da semana.";
      const q = Number(minQuestao);
      if (!(q >= 1 && q <= 60)) return "O tempo por questão deve ficar entre 1 e 60 minutos.";
    }
    if (p === 2 && usaSimulado && duracaoProva < 10) return "Informe a duração da prova do edital.";
    return null;
  };

  const avancar = () => {
    const erro = erroPasso(passo);
    if (erro) return toast.error(erro);
    if (passo === 0) setOrdem([]);
    setPasso(passo + 1);
  };

  // ---------- pagamento dos simulados ----------
  if (clientSecret) {
    return (
      <div className="mx-auto max-w-3xl space-y-4">
        <div className="surface-card flex items-start gap-3 p-5">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-gold/20 text-gold-foreground dark:text-gold">
            <ClipboardCheck className="h-5 w-5" />
          </span>
          <div>
            <h2 className="text-base font-semibold">Pagamento dos simulados</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Seu cronograma será ativado assim que o pagamento for confirmado. O acesso vale até o dia da prova.
            </p>
          </div>
        </div>
        <div className="surface-card p-4">
          <CheckoutSimulado clientSecret={clientSecret} />
        </div>
      </div>
    );
  }

  const resumo = previa.data?.resumo;
  const nomeDe = (id: string) => previa.data?.disciplinas.find((d: any) => d.id === id)?.nome ?? "Disciplina";
  const cabeca = TITULOS[passo];
  const IconeCabeca = cabeca.icone;
  const horasSemana = diasMarcados * (minutosDia > 0 ? minutosDia : 0);
  const totalMinutosPlano = previa.data ? previa.data.disciplinas.reduce((a: number, d: any) => a + d.minutos, 0) : 0;
  const cobertura =
    resumo && resumo.minutosNecessarios > 0
      ? Math.min(100, Math.round((resumo.minutosDisponiveis / resumo.minutosNecessarios) * 100))
      : 100;

  return (
    <div className="mx-auto max-w-4xl space-y-5">
      {rascunho && (
        <div className="flex items-start gap-3 rounded-xl border border-amber-500/40 bg-amber-500/10 p-4 text-sm">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
          <p>
            Você tem um cronograma de <strong>{rascunho.concurso_nome}</strong> aguardando o pagamento dos simulados.
            Criar um novo substitui esse rascunho.
          </p>
        </div>
      )}

      <div className="surface-card px-5 py-4">
        <Passos nomes={PASSOS} atual={passo} onIr={(i) => setPasso(i)} />
      </div>

      <section className="surface-card overflow-hidden">
        <header className="flex items-center gap-4 border-b border-border/60 bg-gradient-to-r from-primary/[0.06] via-transparent to-gold/[0.08] px-5 py-5 sm:px-6">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-primary text-primary-foreground shadow-sm">
            <IconeCabeca className="h-5 w-5" />
          </span>
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
              Passo {passo + 1} de {PASSOS.length}
            </p>
            <h2 className="text-lg font-semibold leading-tight tracking-tight">{cabeca.titulo}</h2>
            <p className="mt-0.5 text-sm text-muted-foreground">{cabeca.texto}</p>
          </div>
        </header>

        <div key={passo} className="animate-in fade-in slide-in-from-right-2 space-y-6 p-5 duration-300 sm:p-6">
          {passo === 0 && (
            <>
              {dados.concursos.length === 0 && (
                <p className="text-sm text-muted-foreground">Nenhum concurso publicado no momento.</p>
              )}
              <div className="grid gap-3 md:grid-cols-2">
                {dados.concursos.map((c) => {
                  const selecionado = concursoId === c.id;
                  const faltam = c.data_prova ? diferencaDias(dados.hoje, c.data_prova) : null;
                  return (
                    <button
                      key={c.id}
                      type="button"
                      disabled={!c.pronto}
                      aria-pressed={selecionado}
                      onClick={() => {
                        setConcursoId(c.id);
                        setDataProva(c.data_prova ?? "");
                      }}
                      className={cn(
                        "group relative flex flex-col gap-3 rounded-xl border p-4 text-left transition-all",
                        selecionado
                          ? "border-primary bg-primary/[0.04] shadow-md ring-2 ring-primary/30"
                          : "border-border bg-card hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md",
                        !c.pronto && "cursor-not-allowed opacity-55 hover:translate-y-0 hover:shadow-none",
                      )}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <span
                          className={cn(
                            "grid h-10 w-10 shrink-0 place-items-center rounded-lg transition-colors",
                            selecionado ? "bg-primary text-primary-foreground" : "bg-primary/10 text-primary",
                          )}
                        >
                          <Landmark className="h-5 w-5" />
                        </span>
                        {selecionado ? (
                          <span className="grid h-6 w-6 place-items-center rounded-full bg-gold text-gold-foreground">
                            <Check className="h-3.5 w-3.5" />
                          </span>
                        ) : !c.pronto ? (
                          <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                            Em breve
                          </span>
                        ) : null}
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold leading-snug">{c.nome}</p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {[c.orgao, c.banca, c.estado, c.ano].filter(Boolean).join(" · ")}
                        </p>
                      </div>
                      {c.pronto && (
                        <div className="mt-auto flex items-center gap-2 text-xs">
                          <CalendarDays className="h-3.5 w-3.5 text-muted-foreground" />
                          {c.data_prova ? (
                            <>
                              <span>{formatarData(c.data_prova)}</span>
                              {faltam !== null && faltam >= 0 && (
                                <span className="rounded-full bg-gold/20 px-2 py-0.5 font-medium text-gold-foreground dark:text-gold">
                                  faltam {faltam} dias
                                </span>
                              )}
                            </>
                          ) : (
                            <span className="text-muted-foreground">Data da prova ainda não definida</span>
                          )}
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
              {concurso && (
                <div className="animate-in fade-in slide-in-from-bottom-1 max-w-sm space-y-1.5 duration-300">
                  <Label htmlFor="data-prova">Data da prova</Label>
                  <Input
                    id="data-prova"
                    type="date"
                    value={dataProva}
                    min={somarDias(dados.hoje, 1)}
                    onChange={(e) => setDataProva(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    {concurso.data_prova
                      ? "Data cadastrada pelo Instituto. Ajuste se a banca divulgar outra."
                      : "A banca ainda não divulgou? Informe uma data prevista; você pode criar outro cronograma depois."}
                  </p>
                </div>
              )}
            </>
          )}

          {passo === 1 && (
            <>
              <div className="grid gap-6 md:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="inicio">Começo em</Label>
                  <Input id="inicio" type="date" value={dataInicio} min={dados.hoje} onChange={(e) => setDataInicio(e.target.value)} />
                  <p className="text-xs text-muted-foreground">
                    O plano vai até {dataProva ? formatarData(somarDias(dataProva, -1)) : "a véspera da prova"}.
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="horas">Horas de estudo por dia</Label>
                  <div className="flex flex-wrap items-center gap-2">
                    {ATALHOS_HORAS.map((h) => (
                      <Pilula key={h} ativo={horas === h} onClick={() => setHoras(h)} className="min-w-11">
                        {h}h
                      </Pilula>
                    ))}
                    <Input
                      id="horas"
                      inputMode="decimal"
                      className="h-9 w-20"
                      value={horas}
                      onChange={(e) => setHoras(e.target.value)}
                      aria-label="Horas por dia (valor livre)"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-2.5">
                <Label>Dias da semana em que você estuda</Label>
                <div className="flex flex-wrap gap-2" role="group" aria-label="Dias da semana">
                  {DIAS.map((d) => (
                    <button
                      key={d.i}
                      type="button"
                      role="checkbox"
                      aria-checked={dias[d.i]}
                      aria-label={d.nome}
                      onClick={() => setDias({ ...dias, [d.i]: !dias[d.i] })}
                      className={cn(
                        "grid h-12 w-14 place-items-center rounded-xl border text-sm font-semibold transition-all",
                        dias[d.i]
                          ? "border-primary bg-primary text-primary-foreground shadow-sm"
                          : "border-border bg-background text-muted-foreground hover:border-primary/50",
                      )}
                    >
                      {d.rotulo}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="minq">Quanto tempo você leva, em média, para resolver uma questão?</Label>
                <div className="flex flex-wrap items-center gap-2">
                  {ATALHOS_QUESTAO.map((q) => (
                    <Pilula key={q} ativo={minQuestao === q} onClick={() => setMinQuestao(q)} className="min-w-14">
                      {q} min
                    </Pilula>
                  ))}
                  <Input
                    id="minq"
                    inputMode="numeric"
                    className="h-9 w-20"
                    value={minQuestao}
                    onChange={(e) => setMinQuestao(e.target.value)}
                    aria-label="Minutos por questão (valor livre)"
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  Cada candidato tem o seu ritmo. Esse valor define quanto tempo o plano reserva para as questões.
                </p>
              </div>

              <div className="flex items-center gap-3 rounded-xl bg-primary/[0.05] px-4 py-3 text-sm">
                <Timer className="h-4 w-4 shrink-0 text-primary" />
                <p>
                  {horasSemana > 0 ? (
                    <>
                      Cerca de <strong>{formatarMinutos(horasSemana)}</strong> de estudo por semana, em{" "}
                      <strong>{diasMarcados}</strong> dia(s).
                    </>
                  ) : (
                    "Informe as horas por dia e marque os dias em que você estuda."
                  )}
                </p>
              </div>
            </>
          )}

          {passo === 2 && (
            <>
              <div
                className={cn(
                  "flex items-start gap-4 rounded-xl border p-4 transition-colors",
                  usaSimulado ? "border-primary/50 bg-primary/[0.04]" : "border-border",
                )}
              >
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-rose-500/10 text-rose-600 dark:text-rose-300">
                  <ClipboardCheck className="h-5 w-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <p className="font-semibold">Incluir simulados quinzenais</p>
                    <Switch checked={usaSimulado} onCheckedChange={setUsaSimulado} aria-label="Incluir simulados quinzenais" />
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Montados pela estrutura da prova do seu concurso, com questões das matérias e sem comentário, para
                    você enxergar o seu nível.
                  </p>
                  <p className="mt-2 text-sm">
                    {dados.simuladoLiberado ? (
                      <span className="rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-xs font-medium text-emerald-700 dark:text-emerald-300">
                        Já incluído no seu acesso
                      </span>
                    ) : (
                      <>
                        <strong className="text-base">R$ 97,00</strong>{" "}
                        <span className="text-muted-foreground">
                          · pagamento único, válido para este cronograma até o dia da prova
                        </span>
                      </>
                    )}
                  </p>
                </div>
              </div>

              {usaSimulado && (
                <div className="animate-in fade-in slide-in-from-bottom-1 space-y-2 duration-300">
                  <Label>Duração da prova no edital</Label>
                  <div className="flex items-center gap-2">
                    <Input inputMode="numeric" className="w-20" value={duracaoH} onChange={(e) => setDuracaoH(e.target.value)} aria-label="Horas" />
                    <span className="text-sm text-muted-foreground">h</span>
                    <Input inputMode="numeric" className="w-20" value={duracaoM} onChange={(e) => setDuracaoM(e.target.value)} aria-label="Minutos" />
                    <span className="text-sm text-muted-foreground">min</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    O tempo de cada simulado é reservado no plano nos dias em que ele cai.
                  </p>
                </div>
              )}
              {!usaSimulado && (
                <p className="text-sm text-muted-foreground">
                  Sem simulados, o plano fica só com estudo, questões e revisões. Você pode incluí-los depois pela seção
                  Simulados.
                </p>
              )}
            </>
          )}

          {passo === 3 && (
            <>
              {previa.isPending && !previa.data ? (
                <p className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" /> Calculando o plano…
                </p>
              ) : previa.error ? (
                <p className="text-sm text-destructive">{(previa.error as Error).message}</p>
              ) : resumo ? (
                <>
                  <div className="grid gap-3 sm:grid-cols-3">
                    <Kpi icone={CalendarDays} rotulo="Dias até a prova" valor={resumo.diasDisponiveis} detalhe={`até ${formatarData(somarDias(dataProva, -1))}`} />
                    <Kpi icone={Hourglass} rotulo="Tempo necessário" valor={formatarMinutos(resumo.minutosNecessarios)} detalhe="estudo, questões e revisões" />
                    <Kpi
                      icone={Gauge}
                      rotulo="Tempo que você tem"
                      valor={formatarMinutos(resumo.minutosDisponiveis)}
                      detalhe={resumo.cabe ? "suficiente" : `faltam ${formatarMinutos(resumo.faltamMinutos)}`}
                      destaque={resumo.cabe}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-medium">Cobertura do conteúdo pelo seu tempo</span>
                      <span className="tabular-nums text-muted-foreground">{cobertura}%</span>
                    </div>
                    <div className="h-2.5 overflow-hidden rounded-full bg-muted">
                      <div
                        className={cn("h-full rounded-full transition-all duration-700", resumo.cabe ? "bg-emerald-500" : "bg-amber-500")}
                        style={{ width: `${cobertura}%` }}
                      />
                    </div>
                  </div>

                  {!resumo.cabe ? (
                    <div className="flex items-start gap-3 rounded-xl border border-amber-500/40 bg-amber-500/10 p-4 text-sm">
                      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
                      <p>
                        O tempo não é suficiente: faltam cerca de <strong>{formatarMinutos(resumo.faltamMinutos)}</strong>.
                        Fora do plano: {resumo.disciplinasForaDoPlano.map((id: string) => nomeDe(id)).join(", ")}. Volte e
                        aumente as horas por dia ou os dias de estudo, ou siga assim e priorize o que cabe.
                      </p>
                    </div>
                  ) : (
                    <div className="flex items-start gap-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm">
                      <CalendarClock className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
                      <p>
                        Você termina o estudo em <strong>{resumo.fimEstudo ? formatarData(resumo.fimEstudo) : "—"}</strong>.
                        {resumo.faseFinal
                          ? ` A fase final vai de ${formatarData(resumo.faseFinal.inicio)} a ${formatarData(resumo.faseFinal.fim)}.`
                          : " Não sobrou tempo para a fase final das últimas 2 semanas; ela é opcional."}
                        {resumo.diasSobra > 14 && ` Sobram ${resumo.diasSobra} dias: dá para recomeçar outro ciclo depois.`}
                      </p>
                    </div>
                  )}

                  <div className="space-y-2">
                    <p className="flex items-center gap-2 text-xs text-muted-foreground">
                      <GripVertical className="h-3.5 w-3.5" />
                      Arraste pela alça para mudar a ordem. Com o teclado, use a alça e as setas para cima e para baixo.
                    </p>
                    <ListaArrastavel
                      className="space-y-2"
                      itens={ordem
                        .map((id) => previa.data!.disciplinas.find((x: any) => x.id === id))
                        .filter(Boolean) as any[]}
                      idDe={(d: any) => d.id}
                      aoReordenar={(novos: any[]) => setOrdem(novos.map((d) => d.id))}
                      renderItem={(d: any, i, { alca, arrastando }) => {
                        const cor = corDisciplina(i);
                        const fatia = totalMinutosPlano > 0 ? Math.max(3, Math.round((d.minutos / totalMinutosPlano) * 100)) : 0;
                        return (
                          <div
                            className={cn(
                              "flex items-center gap-3 rounded-xl border bg-card px-3 py-3 transition-shadow",
                              arrastando ? "border-primary/60 ring-2 ring-primary/30" : "border-border hover:border-primary/30",
                              d.foraDoPlano && "border-amber-500/40 bg-amber-500/[0.04]",
                            )}
                          >
                            <button
                              type="button"
                              {...alca}
                              className="grid h-9 w-7 shrink-0 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                            >
                              <GripVertical className="h-4 w-4" />
                            </button>
                            <span className={cn("grid h-8 w-8 shrink-0 place-items-center rounded-lg text-sm font-semibold tabular-nums", cor.numero)}>
                              {i + 1}
                            </span>
                            <div className="min-w-0 flex-1">
                              <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                                <p className="truncate text-sm font-semibold">{d.nome}</p>
                                {d.foraDoPlano && (
                                  <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-[11px] font-medium text-amber-700 dark:text-amber-300">
                                    fora do plano (falta de tempo)
                                  </span>
                                )}
                              </div>
                              <p className="mt-0.5 text-xs text-muted-foreground">
                                {d.materias} matéria(s) · {formatarMinutos(d.minutos)}
                                {d.inicio && ` · ${formatarData(d.inicio)} a ${formatarData(d.fim)}`}
                              </p>
                              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
                                <div className={cn("h-full rounded-full", cor.barra)} style={{ width: `${fatia}%` }} />
                              </div>
                            </div>
                          </div>
                        );
                      }}
                    />
                  </div>
                </>
              ) : null}
            </>
          )}
        </div>

        <footer className="flex items-center justify-between gap-3 border-t border-border/60 bg-muted/30 px-5 py-4 sm:px-6">
          <div className="flex gap-2">
            {passo > 0 && (
              <Button variant="ghost" onClick={() => setPasso(passo - 1)}>
                Voltar
              </Button>
            )}
            {onCancelar && passo === 0 && (
              <Button variant="ghost" onClick={onCancelar}>
                Cancelar
              </Button>
            )}
          </div>
          {passo < 3 ? (
            <Button onClick={avancar}>Continuar</Button>
          ) : (
            <Button onClick={() => criar.mutate()} disabled={criar.isPending || !resumo}>
              {criar.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {simuladoPendente ? "Criar e pagar os simulados" : "Criar meu cronograma"}
            </Button>
          )}
        </footer>
      </section>
    </div>
  );
}
