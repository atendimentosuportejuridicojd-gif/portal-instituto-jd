import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { AlertTriangle, ArrowDown, ArrowUp, CalendarClock, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CheckoutSimulado } from "@/components/checkout-simulado";
import { alunoCriarCronograma, alunoPreviaCronograma } from "@/lib/cronograma-aluno.functions";
import { iniciarCheckoutSimulado } from "@/lib/simulado-checkout";
import { somarDias } from "@/lib/cronograma-motor";
import { formatarData, formatarMinutos } from "./formato";

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
  { i: 1, rotulo: "Seg" },
  { i: 2, rotulo: "Ter" },
  { i: 3, rotulo: "Qua" },
  { i: 4, rotulo: "Qui" },
  { i: 5, rotulo: "Sex" },
  { i: 6, rotulo: "Sáb" },
  { i: 0, rotulo: "Dom" },
];

const PASSOS = ["Concurso", "Seu tempo", "Simulados", "Revisão do plano"];

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
      if (!Object.values(dias).some(Boolean)) return "Marque pelo menos um dia da semana.";
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

  const mover = (i: number, delta: number) => {
    const novo = [...ordem];
    const j = i + delta;
    if (j < 0 || j >= novo.length) return;
    [novo[i], novo[j]] = [novo[j], novo[i]];
    setOrdem(novo);
  };

  // ---------- pagamento dos simulados ----------
  if (clientSecret) {
    return (
      <div className="space-y-4">
        <div className="surface-card p-5">
          <h2 className="text-base font-semibold">Pagamento dos simulados</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Seu cronograma será ativado assim que o pagamento for confirmado. O acesso vale até o dia da prova.
          </p>
        </div>
        <div className="surface-card p-4">
          <CheckoutSimulado clientSecret={clientSecret} />
        </div>
      </div>
    );
  }

  const resumo = previa.data?.resumo;
  const nomeDe = (id: string) => previa.data?.disciplinas.find((d: any) => d.id === id)?.nome ?? "Disciplina";

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      {rascunho && (
        <div className="flex items-start gap-3 rounded-lg border border-amber-500/40 bg-amber-500/10 p-4 text-sm">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <p>
            Você tem um cronograma de <strong>{rascunho.concurso_nome}</strong> aguardando o pagamento dos simulados.
            Criar um novo substitui esse rascunho.
          </p>
        </div>
      )}

      <ol className="flex flex-wrap gap-2 text-xs">
        {PASSOS.map((nome, i) => (
          <li key={nome}>
            <Badge variant={i === passo ? "default" : i < passo ? "secondary" : "outline"}>
              {i + 1}. {nome}
            </Badge>
          </li>
        ))}
      </ol>

      <section className="surface-card space-y-5 p-5">
        {passo === 0 && (
          <>
            <div>
              <h2 className="text-base font-semibold">Para qual concurso você vai estudar?</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                O plano usa as disciplinas da prova e termina um dia antes dela.
              </p>
            </div>
            <div className="space-y-2">
              {dados.concursos.length === 0 && (
                <p className="text-sm text-muted-foreground">Nenhum concurso publicado no momento.</p>
              )}
              {dados.concursos.map((c) => (
                <label
                  key={c.id}
                  className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3 text-sm ${
                    concursoId === c.id ? "border-primary bg-primary/5" : "border-border/60"
                  } ${c.pronto ? "" : "cursor-not-allowed opacity-60"}`}
                >
                  <input
                    type="radio"
                    name="concurso"
                    className="mt-1"
                    disabled={!c.pronto}
                    checked={concursoId === c.id}
                    onChange={() => {
                      setConcursoId(c.id);
                      setDataProva(c.data_prova ?? "");
                    }}
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block font-medium">{c.nome}</span>
                    <span className="block text-xs text-muted-foreground">
                      {[c.orgao, c.banca, c.estado, c.ano].filter(Boolean).join(" · ")}
                    </span>
                    <span className="block text-xs text-muted-foreground">
                      {c.pronto
                        ? c.data_prova
                          ? `Prova em ${formatarData(c.data_prova)}`
                          : "Data da prova ainda não definida"
                        : "Disponível em breve"}
                    </span>
                  </span>
                </label>
              ))}
            </div>
            {concurso && (
              <div className="space-y-1.5">
                <Label htmlFor="data-prova">Data da prova</Label>
                <Input id="data-prova" type="date" value={dataProva} min={somarDias(dados.hoje, 1)} onChange={(e) => setDataProva(e.target.value)} />
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
            <div>
              <h2 className="text-base font-semibold">Quanto tempo você tem para estudar?</h2>
              <p className="mt-1 text-sm text-muted-foreground">Sem horário fixo: o plano só organiza o que fazer em cada dia.</p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="inicio">Começo em</Label>
                <Input id="inicio" type="date" value={dataInicio} min={dados.hoje} onChange={(e) => setDataInicio(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="horas">Horas de estudo por dia</Label>
                <Input id="horas" inputMode="decimal" value={horas} onChange={(e) => setHoras(e.target.value)} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Dias da semana em que você estuda</Label>
              <div className="flex flex-wrap gap-3">
                {DIAS.map((d) => (
                  <label key={d.i} className="flex items-center gap-2 text-sm">
                    <Checkbox checked={dias[d.i]} onCheckedChange={(v) => setDias({ ...dias, [d.i]: !!v })} />
                    {d.rotulo}
                  </label>
                ))}
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="minq">Quanto tempo você leva, em média, para resolver uma questão? (minutos)</Label>
              <Input id="minq" inputMode="numeric" className="max-w-[8rem]" value={minQuestao} onChange={(e) => setMinQuestao(e.target.value)} />
              <p className="text-xs text-muted-foreground">
                Cada candidato tem o seu ritmo. Esse valor define quanto tempo o plano reserva para as questões.
              </p>
            </div>
          </>
        )}

        {passo === 2 && (
          <>
            <div>
              <h2 className="text-base font-semibold">Simulados no seu cronograma (opcional)</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Um simulado a cada 15 dias, começando na data de início, montado pela estrutura da prova do seu
                concurso. As questões vêm das matérias, sem comentário, para medir o seu nível.
              </p>
            </div>
            <label className="flex items-start gap-3 rounded-lg border border-border/60 p-3 text-sm">
              <Checkbox checked={usaSimulado} onCheckedChange={(v) => setUsaSimulado(!!v)} className="mt-0.5" />
              <span>
                <span className="block font-medium">Incluir simulados quinzenais</span>
                <span className="block text-xs text-muted-foreground">
                  {dados.simuladoLiberado
                    ? "Já incluído no seu acesso."
                    : "Serviço à parte: R$ 97,00, pagamento único, válido para este cronograma até o dia da prova."}
                </span>
              </span>
            </label>
            {usaSimulado && (
              <div className="space-y-1.5">
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
          </>
        )}

        {passo === 3 && (
          <>
            <div>
              <h2 className="text-base font-semibold">Revise o seu plano</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Troque a ordem das disciplinas se quiser. Você estuda uma por vez, na sequência.
              </p>
            </div>
            {previa.isPending && !previa.data ? (
              <p className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" /> Calculando o plano…
              </p>
            ) : previa.error ? (
              <p className="text-sm text-destructive">{(previa.error as Error).message}</p>
            ) : resumo ? (
              <>
                <div className="grid gap-3 sm:grid-cols-3">
                  <Numero rotulo="Dias até a prova" valor={String(resumo.diasDisponiveis)} />
                  <Numero rotulo="Tempo necessário" valor={formatarMinutos(resumo.minutosNecessarios)} />
                  <Numero rotulo="Tempo que você tem" valor={formatarMinutos(resumo.minutosDisponiveis)} />
                </div>

                {!resumo.cabe ? (
                  <div className="flex items-start gap-3 rounded-lg border border-amber-500/40 bg-amber-500/10 p-4 text-sm">
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                    <p>
                      O tempo não é suficiente: faltam cerca de <strong>{formatarMinutos(resumo.faltamMinutos)}</strong>.
                      Fora do plano:{" "}
                      {resumo.disciplinasForaDoPlano.map((id: string) => nomeDe(id)).join(", ")}. Volte e aumente as
                      horas por dia ou os dias de estudo, ou siga assim e priorize o que cabe.
                    </p>
                  </div>
                ) : (
                  <div className="flex items-start gap-3 rounded-lg border border-primary/20 bg-primary/5 p-4 text-sm">
                    <CalendarClock className="mt-0.5 h-4 w-4 shrink-0" />
                    <p>
                      Você termina o estudo em <strong>{resumo.fimEstudo ? formatarData(resumo.fimEstudo) : "—"}</strong>.
                      {resumo.faseFinal
                        ? ` A fase final vai de ${formatarData(resumo.faseFinal.inicio)} a ${formatarData(resumo.faseFinal.fim)}.`
                        : " Não sobrou tempo para a fase final das últimas 2 semanas; ela é opcional."}
                      {resumo.diasSobra > 14 && ` Sobram ${resumo.diasSobra} dias: dá para recomeçar outro ciclo depois.`}
                    </p>
                  </div>
                )}

                <ol className="space-y-2">
                  {ordem.map((id, i) => {
                    const d = previa.data!.disciplinas.find((x: any) => x.id === id);
                    if (!d) return null;
                    return (
                      <li key={id} className="flex items-center gap-3 rounded-lg border border-border/60 px-3 py-2.5 text-sm">
                        <span className="w-5 text-xs text-muted-foreground">{i + 1}.</span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate font-medium">{d.nome}</span>
                          <span className="block text-xs text-muted-foreground">
                            {d.materias} matéria(s) · {formatarMinutos(d.minutos)}
                            {d.inicio && ` · ${formatarData(d.inicio)} a ${formatarData(d.fim)}`}
                            {d.foraDoPlano && " · fora do plano (falta de tempo)"}
                          </span>
                        </span>
                        <Button variant="ghost" size="icon" onClick={() => mover(i, -1)} disabled={i === 0} title="Subir">
                          <ArrowUp className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => mover(i, 1)} disabled={i === ordem.length - 1} title="Descer">
                          <ArrowDown className="h-4 w-4" />
                        </Button>
                      </li>
                    );
                  })}
                </ol>
              </>
            ) : null}
          </>
        )}

        <div className="flex items-center justify-between border-t border-border/60 pt-4">
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
        </div>
      </section>
    </div>
  );
}

function Numero({ rotulo, valor }: { rotulo: string; valor: string }) {
  return (
    <div className="rounded-lg border border-border/60 p-3">
      <p className="text-xs text-muted-foreground">{rotulo}</p>
      <p className="mt-1 text-lg font-semibold tabular-nums">{valor}</p>
    </div>
  );
}
