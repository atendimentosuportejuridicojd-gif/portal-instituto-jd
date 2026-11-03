import { useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowLeft, CalendarClock, CheckCircle2, Loader2, Route } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { alunoCriarCronograma, alunoPreviaCronograma } from "@/lib/cronograma-aluno.functions";
import { ESFERAS } from "@/lib/esferas";
import { cn } from "@/lib/utils";
import { formatarData, formatarMinutos } from "./formato";
import { corDisciplina } from "./visual";

export type TrilhaAssistente = {
  id: string;
  nome: string;
  descricao: string | null;
  trilha_pai_id: string | null;
  esferas: string[];
  qtdMaterias: number;
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

/**
 * Preparação continuada: antes do edital. O aluno escolhe a trilha (cargo) e o tempo que tem; o plano usa só as
 * matérias do Acervo Base da trilha, não tem data de prova e não inclui simulados.
 */
export function AssistenteContinuada({
  hoje,
  trilhas,
  onCriado,
  onVoltar,
}: {
  hoje: string;
  trilhas: TrilhaAssistente[];
  onCriado: () => void;
  onVoltar: () => void;
}) {
  const qc = useQueryClient();
  const previaFn = useServerFn(alunoPreviaCronograma);
  const criarFn = useServerFn(alunoCriarCronograma);

  const [trilhaId, setTrilhaId] = useState("");
  const [dataInicio, setDataInicio] = useState(hoje);
  const [horas, setHoras] = useState("2");
  const [dias, setDias] = useState<Record<number, boolean>>({ 0: false, 1: true, 2: true, 3: true, 4: true, 5: true, 6: true });
  const [minQuestao, setMinQuestao] = useState("3");

  const minutosDia = Math.round(Number(String(horas).replace(",", ".")) * 60);
  const diasMarcados = Object.values(dias).filter(Boolean).length;

  // Esfera → órgão → cargo. O cargo é a trilha sem filhas; o órgão sem cargos vale como cargo.
  const secoes = useMemo(() => {
    const ids = new Set(trilhas.map((t) => t.id));
    const orgaos = trilhas
      .filter((t) => !t.trilha_pai_id || !ids.has(t.trilha_pai_id))
      .map((pai) => ({ pai, filhas: trilhas.filter((t) => t.trilha_pai_id === pai.id) }));
    return [...ESFERAS.map((e) => ({ id: e.id as string, nome: e.nome })), { id: "sem", nome: "Outras" }]
      .map((sec) => ({
        ...sec,
        orgaos: orgaos.filter((o) =>
          sec.id === "sem" ? o.pai.esferas.length === 0 : o.pai.esferas.includes(sec.id),
        ),
      }))
      .filter((sec) => sec.orgaos.length > 0);
  }, [trilhas]);
  const mostrarEsfera = secoes.some((s) => s.id !== "sem");
  const trilha = trilhas.find((t) => t.id === trilhaId);

  const parametros = {
    modo: "continuada" as const,
    trilha_id: trilhaId,
    data_inicio: dataInicio,
    minutos_por_dia: [0, 1, 2, 3, 4, 5, 6].map((i) => (dias[i] ? minutosDia : 0)),
    minutos_por_questao: Math.round(Number(minQuestao)) || 3,
  };

  const erro = (): string | null => {
    if (!trilha) return "Escolha a trilha que você quer estudar.";
    if (dataInicio < hoje) return "A data de início não pode estar no passado.";
    if (!(minutosDia > 0) || minutosDia > 1440) return "Informe as horas de estudo por dia.";
    if (!diasMarcados) return "Marque pelo menos um dia da semana.";
    const q = Number(minQuestao);
    if (!(q >= 1 && q <= 60)) return "O tempo por questão deve ficar entre 1 e 60 minutos.";
    return null;
  };

  const previa = useMutation({
    mutationFn: () => previaFn({ data: parametros }),
    onError: (e: any) => toast.error(e.message),
  });
  const criar = useMutation({
    mutationFn: () => criarFn({ data: parametros }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["aluno", "cronograma"] });
      toast.success("Cronograma criado!");
      onCriado();
    },
    onError: (e: any) => toast.error(e.message),
  });

  const verPrevia = () => {
    const e = erro();
    if (e) return toast.error(e);
    previa.mutate();
  };
  const resumo = previa.data?.resumo;

  const CartaoTrilha = ({ t }: { t: TrilhaAssistente }) => {
    const pronta = t.qtdMaterias > 0;
    const marcada = trilhaId === t.id;
    return (
      <button
        type="button"
        disabled={!pronta}
        onClick={() => {
          setTrilhaId(t.id);
          previa.reset();
        }}
        className={cn(
          "flex items-start justify-between gap-3 rounded-xl border p-3.5 text-left transition",
          marcada ? "border-primary bg-primary/5 ring-1 ring-primary" : "border-border/60 hover:border-primary/40",
          !pronta && "cursor-not-allowed opacity-55",
        )}
      >
        <span className="min-w-0">
          <span className="block truncate text-sm font-semibold">{t.nome}</span>
          <span className="mt-0.5 block text-xs text-muted-foreground">
            {pronta ? `${t.qtdMaterias} matéria(s) do Acervo Base` : "Em preparação — matérias em breve"}
          </span>
        </span>
        {marcada && <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />}
      </button>
    );
  };

  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <Button variant="ghost" size="sm" onClick={onVoltar}>
        <ArrowLeft className="mr-1.5 h-4 w-4" />
        Trocar de direção
      </Button>

      <section className="surface-card space-y-1 p-5 sm:p-6">
        <div className="flex items-center gap-3">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-primary text-primary-foreground shadow-sm">
            <Route className="h-5 w-5" />
          </span>
          <div>
            <h2 className="text-lg font-semibold">Preparação continuada</h2>
            <p className="text-sm text-muted-foreground">
              Antes do edital: você escolhe o cargo e estuda o Acervo Base dele, uma disciplina por vez, com revisão pelas
              questões. Sem data de prova e sem simulados.
            </p>
          </div>
        </div>
      </section>

      <section className="surface-card space-y-5 p-5 sm:p-6">
        <div>
          <h3 className="text-sm font-semibold">1. Qual trilha você vai estudar?</h3>
          <p className="text-xs text-muted-foreground">Trilhas sem matérias ainda não podem ser escolhidas.</p>
        </div>
        {trilhas.length === 0 && <p className="text-sm text-muted-foreground">Nenhuma trilha disponível para a sua carreira.</p>}
        {secoes.map((sec) => (
          <div key={sec.id} className="space-y-3">
            {mostrarEsfera && <h4 className="border-b border-border/60 pb-1 text-sm font-semibold">{sec.nome}</h4>}
            {sec.orgaos
              .filter((o) => o.filhas.length > 0)
              .map((o) => (
                <div key={o.pai.id} className="space-y-2">
                  <p className="text-xs font-semibold text-muted-foreground">{o.pai.nome}</p>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {o.filhas.map((f) => (
                      <CartaoTrilha key={f.id} t={f} />
                    ))}
                  </div>
                </div>
              ))}
            {sec.orgaos.some((o) => o.filhas.length === 0) && (
              <div className="grid gap-2 sm:grid-cols-2">
                {sec.orgaos
                  .filter((o) => o.filhas.length === 0)
                  .map((o) => (
                    <CartaoTrilha key={o.pai.id} t={o.pai} />
                  ))}
              </div>
            )}
          </div>
        ))}
      </section>

      <section className="surface-card space-y-5 p-5 sm:p-6">
        <h3 className="text-sm font-semibold">2. Quanto tempo você tem para estudar?</h3>
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="space-y-1.5">
            <Label htmlFor="cc-inicio">Começar em</Label>
            <Input id="cc-inicio" type="date" min={hoje} value={dataInicio} onChange={(e) => setDataInicio(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="cc-horas">Horas por dia</Label>
            <Input id="cc-horas" inputMode="decimal" value={horas} onChange={(e) => setHoras(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="cc-q">Minutos por questão</Label>
            <Input id="cc-q" inputMode="numeric" value={minQuestao} onChange={(e) => setMinQuestao(e.target.value)} />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label>Dias da semana</Label>
          <div className="flex flex-wrap gap-3">
            {DIAS.map((d) => (
              <label key={d.i} className="flex cursor-pointer items-center gap-2 text-sm">
                <Checkbox checked={!!dias[d.i]} onCheckedChange={(v) => setDias((x) => ({ ...x, [d.i]: !!v }))} />
                {d.rotulo}
              </label>
            ))}
          </div>
        </div>
        <Button onClick={verPrevia} disabled={previa.isPending}>
          {previa.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Ver prévia do plano
        </Button>
      </section>

      {resumo && previa.data && (
        <section className="surface-card space-y-4 p-5 sm:p-6">
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
            <span className="inline-flex items-center gap-1.5">
              <CalendarClock className="h-4 w-4 text-muted-foreground" />
              {resumo.fimEstudo ? (
                <>
                  Você termina a trilha em <strong>{formatarData(resumo.fimEstudo)}</strong>
                </>
              ) : (
                "Sem conteúdo para planejar"
              )}
            </span>
            <span className="text-muted-foreground">{formatarMinutos(resumo.minutosNecessarios)} de estudo no total</span>
          </div>
          {!resumo.cabe && (
            <p className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-sm">
              Com esse ritmo o plano passa de 3 anos e parte do conteúdo fica de fora. Aumente as horas por dia ou os dias
              da semana.
            </p>
          )}
          <ul className="divide-y divide-border/60 rounded-lg border border-border/60">
            {previa.data.disciplinas.map((d: any, i: number) => (
              <li key={d.id} className="flex items-center justify-between gap-3 px-3 py-2.5 text-sm">
                <span className="flex min-w-0 items-center gap-2">
                  <span className={cn("h-2.5 w-2.5 shrink-0 rounded-full", corDisciplina(i).barra)} />
                  <span className="truncate">{d.nome}</span>
                </span>
                <span className="shrink-0 text-xs text-muted-foreground">
                  {d.materias} matéria(s) · {formatarMinutos(d.minutos)}
                  {d.inicio && ` · ${formatarData(d.inicio)} a ${formatarData(d.fim)}`}
                </span>
              </li>
            ))}
          </ul>
          <Button onClick={() => criar.mutate()} disabled={criar.isPending || !resumo.fimEstudo}>
            {criar.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Criar meu cronograma
          </Button>
        </section>
      )}
    </div>
  );
}
