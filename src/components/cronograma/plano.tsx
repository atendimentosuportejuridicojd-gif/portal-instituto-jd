import { Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import {
  AlertTriangle,
  BookOpen,
  CalendarClock,
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ClipboardCheck,
  Clock,
  Flame,
  ListChecks,
  PartyPopper,
  RefreshCw,
  Target,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { alunoMarcarBloco, alunoRecalcularCronograma } from "@/lib/cronograma-aluno.functions";
import { somarDias } from "@/lib/cronograma-motor";
import { cn } from "@/lib/utils";
import { formatarData, formatarDia, formatarMinutos, proximosDias } from "./formato";
import { AvisoMetodo } from "./metodo";
import { RevisaoBloco } from "./revisao";
import { AnelProgresso, corDisciplina, ESTILO_TIPO, Kpi, SeloTipo } from "./visual";

export type Bloco = {
  id: string;
  data: string;
  ordem: number;
  tipo: "estudo" | "questoes" | "revisao" | "fase_final" | "simulado";
  disciplina_id: string | null;
  material_id: string | null;
  titulo: string;
  minutos: number;
  continuacao: boolean;
  concluido: boolean;
};

export type EstadoCronograma = {
  hoje: string;
  cronograma: any;
  blocos: Bloco[];
  disciplinas: { id: string; nome: string }[];
  progresso: { totalMinutos: number; feitoMinutos: number; percentual: number };
  diasAteProva: number | null;
  diasAtrasados: number;
};

type Marcar = (v: { id: string; concluido: boolean }) => void;

export function PlanoDoAluno({ estado, onNovo }: { estado: EstadoCronograma; onNovo: () => void }) {
  const qc = useQueryClient();
  const marcarFn = useServerFn(alunoMarcarBloco);
  const recalcularFn = useServerFn(alunoRecalcularCronograma);
  const invalidar = () => qc.invalidateQueries({ queryKey: ["aluno", "cronograma"] });

  const marcar = useMutation({
    mutationFn: (v: { id: string; concluido: boolean }) => marcarFn({ data: v }),
    onSuccess: invalidar,
    onError: (e: any) => toast.error(e.message),
  });
  const recalcular = useMutation({
    mutationFn: () => recalcularFn(),
    onSuccess: () => {
      toast.success("Plano recalculado a partir de hoje.");
      invalidar();
    },
    onError: (e: any) => toast.error(e.message),
  });

  const { cronograma: c, blocos, hoje } = estado;
  const resumo = c.resumo ?? {};
  const [mes, setMes] = useState(hoje.slice(0, 7));
  const [diaSelecionado, setDiaSelecionado] = useState<string | null>(null);

  const nomeDisciplina = useMemo(() => new Map(estado.disciplinas.map((d) => [d.id, d.nome])), [estado.disciplinas]);
  const indiceCor = useMemo(() => {
    const ordem: string[] = c.ordem_disciplinas ?? [];
    return (id: string | null) => {
      const i = id ? ordem.indexOf(id) : -1;
      return i >= 0 ? i : id ? estado.disciplinas.findIndex((d) => d.id === id) : 0;
    };
  }, [c.ordem_disciplinas, estado.disciplinas]);

  const porDia = useMemo(() => {
    const mapa = new Map<string, Bloco[]>();
    for (const b of blocos) {
      const l = mapa.get(b.data) ?? [];
      l.push(b);
      mapa.set(b.data, l);
    }
    return mapa;
  }, [blocos]);
  const doDia = (dia: string) => porDia.get(dia) ?? [];

  const atrasados = blocos.filter((b) => !b.concluido && b.data < hoje && b.tipo !== "simulado");
  const pendentesHoje = doDia(hoje).filter((b) => !b.concluido);
  const proxima = [...atrasados, ...doDia(hoje)].find((b) => !b.concluido) ?? null;
  const fimPlano = somarDias(c.data_prova, -1);

  return (
    <div className="space-y-6">
      {/* Cabeçalho do plano */}
      <section className="surface-card overflow-hidden">
        <div className="relative bg-gradient-to-br from-primary to-primary/85 p-5 text-primary-foreground sm:p-7">
          <div aria-hidden className="pointer-events-none absolute -right-12 -top-12 h-48 w-48 rounded-full bg-gold/25 blur-3xl" />
          <div className="relative flex flex-wrap items-center justify-between gap-6">
            <div className="min-w-0 space-y-3">
              <p className="text-[11px] font-semibold uppercase tracking-widest text-primary-foreground/70">
                Método J&D · meu cronograma
              </p>
              <h2 className="text-xl font-semibold leading-tight tracking-tight sm:text-2xl">{c.concurso_nome}</h2>
              <div className="flex flex-wrap gap-2 text-xs">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1">
                  <Target className="h-3.5 w-3.5" /> Prova em {formatarData(c.data_prova)}
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1">
                  <CalendarDays className="h-3.5 w-3.5" /> {formatarData(c.data_inicio)} a {formatarData(fimPlano)}
                </span>
                {c.usa_simulado && (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1">
                    <ClipboardCheck className="h-3.5 w-3.5" /> Simulados incluídos
                  </span>
                )}
              </div>
              <div className="flex flex-wrap gap-2 pt-1">
                <Button variant="secondary" size="sm" onClick={() => recalcular.mutate()} disabled={recalcular.isPending}>
                  <RefreshCw className={cn("mr-1.5 h-3.5 w-3.5", recalcular.isPending && "animate-spin")} />
                  Recalcular a partir de hoje
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-primary-foreground hover:bg-white/10 hover:text-primary-foreground"
                  onClick={onNovo}
                >
                  Novo cronograma
                </Button>
              </div>
            </div>
            <div className="flex items-center gap-6">
              {estado.diasAteProva !== null && estado.diasAteProva >= 0 && (
                <div className="text-center">
                  <p className="text-5xl font-bold tabular-nums leading-none">{estado.diasAteProva}</p>
                  <p className="mt-1.5 text-xs text-primary-foreground/70">dias para a prova</p>
                </div>
              )}
              <AnelProgresso valor={estado.progresso.percentual} tamanho={104}>
                <div>
                  <p className="text-xl font-semibold tabular-nums leading-none">{estado.progresso.percentual}%</p>
                  <p className="mt-0.5 text-[10px] uppercase tracking-wide text-primary-foreground/70">concluído</p>
                </div>
              </AnelProgresso>
            </div>
          </div>
        </div>
      </section>

      <AvisoMetodo cronogramaId={c.id} />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi
          icone={Clock}
          rotulo="Estudado até agora"
          valor={formatarMinutos(estado.progresso.feitoMinutos)}
          detalhe={`de ${formatarMinutos(estado.progresso.totalMinutos)} planejadas`}
        />
        <Kpi
          icone={ListChecks}
          rotulo="Para hoje"
          valor={`${pendentesHoje.length} atividade(s)`}
          detalhe={pendentesHoje.length ? formatarMinutos(pendentesHoje.reduce((a, b) => a + b.minutos, 0)) : "tudo em dia"}
        />
        <Kpi
          icone={Flame}
          rotulo="Em atraso"
          valor={estado.diasAtrasados ? `${estado.diasAtrasados} dia(s)` : "Nenhum"}
          detalhe={estado.diasAtrasados ? "recalcule o plano" : "no ritmo certo"}
          destaque={!estado.diasAtrasados}
        />
        <Kpi
          icone={CalendarClock}
          rotulo="Fim do estudo"
          valor={resumo.fimEstudo ? formatarData(resumo.fimEstudo) : "—"}
          detalhe={resumo.faseFinal ? `fase final a partir de ${formatarData(resumo.faseFinal.inicio)}` : "sem fase final"}
        />
      </div>

      {estado.diasAtrasados > 0 && (
        <Aviso icon={AlertTriangle} tom="alerta">
          Você tem {estado.diasAtrasados} dia(s) com atividades em atraso. Use <strong>Recalcular a partir de hoje</strong>{" "}
          para redistribuir o que falta até a prova.
        </Aviso>
      )}
      {resumo.cabe === false && (
        <Aviso icon={AlertTriangle} tom="alerta">
          O tempo até a prova não é suficiente para todo o conteúdo (faltam cerca de{" "}
          {formatarMinutos(resumo.faltamMinutos ?? 0)}). Aumente as horas por dia criando um novo cronograma.
        </Aviso>
      )}
      {resumo.cabe && (resumo.diasSobra ?? 0) > 14 && (
        <Aviso icon={CalendarClock} tom="info">
          Seu estudo termina em {resumo.fimEstudo ? formatarData(resumo.fimEstudo) : "—"} e sobram {resumo.diasSobra} dias
          antes da fase final. Se quiser, crie um novo cronograma para recomeçar o ciclo.
        </Aviso>
      )}

      <Tabs defaultValue="hoje">
        <TabsList className="grid h-auto w-full grid-cols-4 sm:inline-grid sm:w-auto">
          <TabsTrigger value="hoje">Hoje</TabsTrigger>
          <TabsTrigger value="semana">Semana</TabsTrigger>
          <TabsTrigger value="mes">Mês</TabsTrigger>
          <TabsTrigger value="disciplinas">Disciplinas</TabsTrigger>
        </TabsList>

        {/* HOJE */}
        <TabsContent value="hoje" className="mt-5 space-y-5">
          {proxima ? (
            <div className="relative overflow-hidden rounded-xl border-2 border-gold/50 bg-gold/[0.07] p-4 sm:p-5">
              <div className="flex flex-wrap items-center gap-4">
                <div className="min-w-0 flex-1 space-y-1.5">
                  <p className="text-[11px] font-semibold uppercase tracking-widest text-gold-foreground/80 dark:text-gold">
                    {proxima.data < hoje ? "Atividade em atraso" : "Sua próxima atividade"}
                  </p>
                  <p className="text-base font-semibold leading-snug">{proxima.titulo}</p>
                  <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                    <SeloTipo tipo={proxima.tipo} />
                    {proxima.disciplina_id && <span>{nomeDisciplina.get(proxima.disciplina_id)}</span>}
                    <span>· {formatarMinutos(proxima.minutos)}</span>
                    {proxima.data < hoje && <span>· era para {formatarDia(proxima.data)}</span>}
                  </div>
                </div>
                <AcaoDoBloco bloco={proxima} grande />
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm">
              <PartyPopper className="h-5 w-5 shrink-0 text-emerald-600 dark:text-emerald-400" />
              <p>
                {doDia(hoje).length
                  ? "Tudo feito por hoje. Bom trabalho!"
                  : "Nada programado para hoje. Aproveite para descansar ou adiantar algo."}
              </p>
            </div>
          )}

          {atrasados.length > 0 && (
            <Dia titulo="Em atraso" blocos={atrasados} nomeDisciplina={nomeDisciplina} onMarcar={marcar.mutate} mostrarData />
          )}
          <Dia
            titulo={`Hoje — ${formatarDia(hoje)}`}
            blocos={doDia(hoje)}
            nomeDisciplina={nomeDisciplina}
            onMarcar={marcar.mutate}
            vazio="Nada programado para hoje."
          />
        </TabsContent>

        {/* SEMANA */}
        <TabsContent value="semana" className="mt-5">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {proximosDias(hoje, 7).map((d) => {
              const lista = doDia(d);
              const total = lista.reduce((a, b) => a + b.minutos, 0);
              const feitos = lista.filter((b) => b.concluido).length;
              return (
                <div
                  key={d}
                  className={cn(
                    "surface-card flex flex-col gap-2 p-3.5",
                    d === hoje && "border-gold/70 ring-2 ring-gold/30",
                  )}
                >
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold capitalize">{formatarDia(d)}</p>
                    {d === hoje ? (
                      <span className="rounded-full bg-gold px-2 py-0.5 text-[10px] font-semibold uppercase text-gold-foreground">
                        hoje
                      </span>
                    ) : (
                      total > 0 && <span className="text-[11px] text-muted-foreground">{formatarMinutos(total)}</span>
                    )}
                  </div>
                  {lista.length === 0 ? (
                    <p className="py-3 text-center text-xs text-muted-foreground">Dia livre</p>
                  ) : (
                    <ul className="space-y-1.5">
                      {lista.map((b) => (
                        <li
                          key={b.id}
                          className={cn(
                            "flex items-start gap-2 rounded-lg border-l-[3px] bg-muted/40 px-2 py-1.5",
                            ESTILO_TIPO[b.tipo]?.borda,
                            b.concluido && "opacity-55",
                          )}
                        >
                          <Checkbox
                            checked={b.concluido}
                            aria-label={`Concluir ${b.titulo}`}
                            className="mt-0.5"
                            onCheckedChange={(v) => marcar.mutate({ id: b.id, concluido: !!v })}
                          />
                          <div className="min-w-0 flex-1">
                            <p className={cn("line-clamp-2 text-xs font-medium leading-snug", b.concluido && "line-through")}>
                              {b.titulo}
                            </p>
                            <p className="text-[10px] text-muted-foreground">
                              {ESTILO_TIPO[b.tipo]?.rotulo} · {formatarMinutos(b.minutos)}
                            </p>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                  {lista.length > 0 && (
                    <p className="mt-auto text-[10px] text-muted-foreground">
                      {feitos} de {lista.length} feita(s)
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </TabsContent>

        {/* MÊS */}
        <TabsContent value="mes" className="mt-5 space-y-5">
          <CalendarioMes
            mes={mes}
            aoMudarMes={setMes}
            porDia={porDia}
            hoje={hoje}
            inicio={c.data_inicio}
            fim={fimPlano}
            selecionado={diaSelecionado}
            aoSelecionar={setDiaSelecionado}
          />
          {diaSelecionado ? (
            <Dia
              titulo={formatarDia(diaSelecionado)}
              blocos={doDia(diaSelecionado)}
              nomeDisciplina={nomeDisciplina}
              onMarcar={marcar.mutate}
              vazio="Dia livre."
            />
          ) : (
            <p className="text-center text-sm text-muted-foreground">Toque num dia do calendário para ver as atividades.</p>
          )}
        </TabsContent>

        {/* DISCIPLINAS */}
        <TabsContent value="disciplinas" className="mt-5 space-y-3">
          {estado.disciplinas.map((d) => {
            const bs = blocos.filter((b) => b.disciplina_id === d.id);
            const total = bs.reduce((a, b) => a + b.minutos, 0);
            const feito = bs.filter((b) => b.concluido).reduce((a, b) => a + b.minutos, 0);
            const pct = total ? Math.round((feito / total) * 100) : 0;
            const cor = corDisciplina(indiceCor(d.id));
            const situacao =
              pct >= 100
                ? { texto: "Concluída", classe: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300" }
                : pct > 0
                  ? { texto: "Em andamento", classe: "bg-sky-500/10 text-sky-700 dark:text-sky-300" }
                  : { texto: "A começar", classe: "bg-muted text-muted-foreground" };
            return (
              <div key={d.id} className="surface-card flex gap-4 p-4">
                <span className={cn("w-1.5 shrink-0 rounded-full", cor.barra)} aria-hidden />
                <div className="min-w-0 flex-1 space-y-2.5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm font-semibold">{d.nome}</p>
                    <span className={cn("rounded-full px-2.5 py-0.5 text-[11px] font-medium", situacao.classe)}>
                      {situacao.texto}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                      <div className={cn("h-full rounded-full transition-all duration-700", cor.barra)} style={{ width: `${pct}%` }} />
                    </div>
                    <span className="w-10 shrink-0 text-right text-xs font-medium tabular-nums">{pct}%</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {bs.length ? `${formatarData(bs[0].data)} a ${formatarData(bs[bs.length - 1].data)}` : "—"} ·{" "}
                    {formatarMinutos(feito)} de {formatarMinutos(total)}
                  </p>
                </div>
              </div>
            );
          })}
          {resumo.disciplinasForaDoPlano?.length > 0 && (
            <p className="text-xs text-muted-foreground">
              Fora do plano por falta de tempo:{" "}
              {resumo.disciplinasForaDoPlano.map((id: string) => nomeDisciplina.get(id) ?? "disciplina").join(", ")}.
            </p>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ---------- calendário do mês ----------

const pad2 = (n: number) => String(n).padStart(2, "0");

function somarMes(mes: string, n: number): string {
  const [a, m] = mes.split("-").map(Number);
  const d = new Date(Date.UTC(a, m - 1 + n, 1));
  return `${d.getUTCFullYear()}-${pad2(d.getUTCMonth() + 1)}`;
}

function CalendarioMes({
  mes,
  aoMudarMes,
  porDia,
  hoje,
  inicio,
  fim,
  selecionado,
  aoSelecionar,
}: {
  mes: string;
  aoMudarMes: (m: string) => void;
  porDia: Map<string, Bloco[]>;
  hoje: string;
  inicio: string;
  fim: string;
  selecionado: string | null;
  aoSelecionar: (dia: string) => void;
}) {
  const [ano, m] = mes.split("-").map(Number);
  const primeiroDiaSemana = new Date(Date.UTC(ano, m - 1, 1)).getUTCDay();
  const diasNoMes = new Date(Date.UTC(ano, m, 0)).getUTCDate();
  const titulo = new Date(Date.UTC(ano, m - 1, 1)).toLocaleDateString("pt-BR", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
  const podeVoltar = mes > inicio.slice(0, 7);
  const podeAvancar = mes < fim.slice(0, 7);

  const celulas: (string | null)[] = [
    ...Array.from({ length: primeiroDiaSemana }, () => null),
    ...Array.from({ length: diasNoMes }, (_, i) => `${mes}-${pad2(i + 1)}`),
  ];

  return (
    <div className="surface-card p-4 sm:p-5">
      <div className="mb-4 flex items-center justify-between">
        <Button variant="ghost" size="icon" disabled={!podeVoltar} onClick={() => aoMudarMes(somarMes(mes, -1))} aria-label="Mês anterior">
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <p className="text-sm font-semibold capitalize">{titulo}</p>
        <Button variant="ghost" size="icon" disabled={!podeAvancar} onClick={() => aoMudarMes(somarMes(mes, 1))} aria-label="Próximo mês">
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      <div className="grid grid-cols-7 gap-1.5 text-center text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
        {["D", "S", "T", "Q", "Q", "S", "S"].map((l, i) => (
          <span key={i}>{l}</span>
        ))}
      </div>
      <div className="mt-1.5 grid grid-cols-7 gap-1.5">
        {celulas.map((dia, i) => {
          if (!dia) return <span key={`v${i}`} />;
          const lista = porDia.get(dia) ?? [];
          const dentro = dia >= inicio && dia <= fim;
          const total = lista.reduce((a, b) => a + b.minutos, 0);
          const todosFeitos = lista.length > 0 && lista.every((b) => b.concluido);
          const tipos = [...new Set(lista.map((b) => b.tipo))].slice(0, 4);
          const intensidade =
            total === 0 ? "" : total <= 60 ? "bg-primary/[0.06]" : total <= 120 ? "bg-primary/[0.12]" : total <= 180 ? "bg-primary/[0.2]" : "bg-primary/[0.3]";
          return (
            <button
              key={dia}
              type="button"
              disabled={!dentro}
              onClick={() => aoSelecionar(dia)}
              aria-label={`${formatarDia(dia)}${total ? `, ${formatarMinutos(total)}` : ""}`}
              className={cn(
                "relative flex aspect-square min-h-11 flex-col items-center justify-center gap-0.5 rounded-lg border text-sm transition-all",
                dentro ? cn("border-border/60 hover:border-primary/50 hover:shadow-sm", intensidade) : "border-transparent text-muted-foreground/40",
                dia === hoje && "border-gold ring-2 ring-gold/40",
                selecionado === dia && "border-primary ring-2 ring-primary/40",
              )}
            >
              <span className={cn("font-medium tabular-nums", dia === hoje && "font-bold")}>{Number(dia.slice(8))}</span>
              {tipos.length > 0 && (
                <span className="flex gap-0.5">
                  {tipos.map((t) => (
                    <span key={t} className={cn("h-1.5 w-1.5 rounded-full", ESTILO_TIPO[t]?.ponto)} />
                  ))}
                </span>
              )}
              {todosFeitos && <CheckCircle2 className="absolute right-1 top-1 h-3 w-3 text-emerald-500" />}
            </button>
          );
        })}
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[11px] text-muted-foreground">
        {Object.entries(ESTILO_TIPO).map(([tipo, e]) => (
          <span key={tipo} className="inline-flex items-center gap-1.5">
            <span className={cn("h-2 w-2 rounded-full", e.ponto)} />
            {e.rotulo}
          </span>
        ))}
      </div>
    </div>
  );
}

// ---------- peças ----------

function Aviso({
  icon: Icon,
  tom,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  tom: "alerta" | "info";
  children: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "flex items-start gap-3 rounded-xl border p-4 text-sm",
        tom === "alerta" ? "border-amber-500/40 bg-amber-500/10" : "border-primary/20 bg-primary/5",
      )}
    >
      <span
        className={cn(
          "grid h-7 w-7 shrink-0 place-items-center rounded-full",
          tom === "alerta" ? "bg-amber-500/20 text-amber-700 dark:text-amber-300" : "bg-primary/10 text-primary",
        )}
      >
        <Icon className="h-4 w-4" />
      </span>
      <p className="pt-0.5">{children}</p>
    </div>
  );
}

function Dia({
  titulo,
  blocos,
  nomeDisciplina,
  onMarcar,
  vazio,
  mostrarData,
}: {
  titulo: string;
  blocos: Bloco[];
  nomeDisciplina: Map<string, string>;
  onMarcar: Marcar;
  vazio?: string;
  mostrarData?: boolean;
}) {
  const total = blocos.reduce((a, b) => a + b.minutos, 0);
  const feitos = blocos.filter((b) => b.concluido).length;
  return (
    <section className="space-y-3">
      <div className="flex items-end justify-between gap-3">
        <h3 className="text-sm font-semibold capitalize">{titulo}</h3>
        {blocos.length > 0 && (
          <span className="text-xs text-muted-foreground">
            {feitos}/{blocos.length} feita(s) · {formatarMinutos(total)}
          </span>
        )}
      </div>
      {blocos.length > 0 && <Progress value={(feitos / blocos.length) * 100} className="h-1" />}
      {blocos.length === 0 ? (
        vazio && <p className="rounded-lg border border-dashed border-border p-4 text-center text-sm text-muted-foreground">{vazio}</p>
      ) : (
        <ul className="space-y-2">
          {blocos.map((b) => (
            <li
              key={b.id}
              className={cn(
                "flex flex-wrap items-center gap-3 rounded-lg border border-l-4 bg-card px-3.5 py-3 transition-colors hover:bg-accent/30",
                ESTILO_TIPO[b.tipo]?.borda,
                b.concluido && "opacity-60",
              )}
            >
              <Checkbox
                checked={b.concluido}
                aria-label={`Concluir ${b.titulo}`}
                onCheckedChange={(v) => onMarcar({ id: b.id, concluido: !!v })}
              />
              <div className="min-w-0 flex-1">
                <p className={cn("text-sm font-medium leading-snug", b.concluido && "text-muted-foreground line-through")}>
                  {b.titulo}
                  {b.continuacao && <span className="text-xs font-normal text-muted-foreground"> (continuação)</span>}
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {mostrarData && `${formatarDia(b.data)} · `}
                  {b.disciplina_id ? `${nomeDisciplina.get(b.disciplina_id) ?? ""} · ` : ""}
                  {formatarMinutos(b.minutos)}
                </p>
              </div>
              <SeloTipo tipo={b.tipo} />
              <AcaoDoBloco bloco={b} />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function AcaoDoBloco({ bloco, grande }: { bloco: Bloco; grande?: boolean }) {
  const tamanho = grande ? "default" : "sm";
  if (bloco.tipo === "estudo" && bloco.material_id) {
    return (
      <Button asChild size={tamanho} variant={grande ? "default" : "outline"}>
        <Link to="/materiais/$materialId/leitura" params={{ materialId: bloco.material_id }}>
          <BookOpen className="mr-1.5 h-4 w-4" />
          Estudar
        </Link>
      </Button>
    );
  }
  if (bloco.tipo === "questoes" && bloco.material_id) {
    return (
      <Button asChild size={tamanho} variant={grande ? "default" : "outline"}>
        <Link to="/materiais/$materialId/questoes" params={{ materialId: bloco.material_id }}>
          <ListChecks className="mr-1.5 h-4 w-4" />
          Resolver
        </Link>
      </Button>
    );
  }
  if (bloco.tipo === "revisao") {
    return <RevisaoBloco blocoId={bloco.id} />;
  }
  if (bloco.tipo === "simulado") {
    return (
      <Button asChild size={tamanho} variant={grande ? "default" : "outline"}>
        <Link to="/simulados">
          <ClipboardCheck className="mr-1.5 h-4 w-4" />
          Abrir simulados
        </Link>
      </Button>
    );
  }
  if (bloco.tipo === "fase_final") {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
        <CheckCircle2 className="h-3.5 w-3.5" />
        Em definição
      </span>
    );
  }
  return null;
}
