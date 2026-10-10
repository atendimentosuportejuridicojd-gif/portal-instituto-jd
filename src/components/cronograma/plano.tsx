import { Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useMemo } from "react";
import { toast } from "sonner";
import { AlertTriangle, BookOpen, CalendarClock, CheckCircle2, ListChecks, RefreshCw } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { alunoMarcarBloco, alunoRecalcularCronograma } from "@/lib/cronograma-aluno.functions";
import { somarDias } from "@/lib/cronograma-motor";
import { formatarData, formatarDia, formatarMinutos, proximosDias, ROTULO_TIPO } from "./formato";

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

export function PlanoDoAluno({
  estado,
  onNovo,
}: {
  estado: EstadoCronograma;
  onNovo: () => void;
}) {
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
  const nomeDisciplina = useMemo(
    () => new Map(estado.disciplinas.map((d) => [d.id, d.nome])),
    [estado.disciplinas],
  );

  const doDia = (dia: string) => blocos.filter((b) => b.data === dia);
  const atrasados = blocos.filter((b) => !b.concluido && b.data < hoje && b.tipo !== "simulado");

  return (
    <div className="space-y-6">
      <section className="surface-card p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="text-base font-semibold tracking-tight">{c.concurso_nome}</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Prova em {formatarData(c.data_prova)}
              {estado.diasAteProva !== null && estado.diasAteProva >= 0 && ` · faltam ${estado.diasAteProva} dias`}
              {" · "}plano de {formatarData(c.data_inicio)} a {formatarData(somarDias(c.data_prova, -1))}
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => recalcular.mutate()}
              disabled={recalcular.isPending}
            >
              <RefreshCw className="mr-1 h-3.5 w-3.5" />
              Recalcular a partir de hoje
            </Button>
            <Button variant="ghost" size="sm" onClick={onNovo}>
              Novo cronograma
            </Button>
          </div>
        </div>
        <div className="mt-4 flex items-center gap-3">
          <Progress value={estado.progresso.percentual} className="h-2" />
          <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
            {estado.progresso.percentual}% · {formatarMinutos(estado.progresso.feitoMinutos)} de{" "}
            {formatarMinutos(estado.progresso.totalMinutos)}
          </span>
        </div>
      </section>

      {estado.diasAtrasados > 0 && (
        <Aviso icon={AlertTriangle} tom="alerta">
          Você tem {estado.diasAtrasados} dia(s) com atividades em atraso. Use{" "}
          <strong>Recalcular a partir de hoje</strong> para redistribuir o que falta até a prova.
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
          Seu estudo termina em {resumo.fimEstudo ? formatarData(resumo.fimEstudo) : "—"} e sobram{" "}
          {resumo.diasSobra} dias antes da fase final. Se quiser, crie um novo cronograma para recomeçar o ciclo.
        </Aviso>
      )}

      <Tabs defaultValue="hoje">
        <TabsList>
          <TabsTrigger value="hoje">Hoje</TabsTrigger>
          <TabsTrigger value="semana">Semana</TabsTrigger>
          <TabsTrigger value="mes">Mês</TabsTrigger>
          <TabsTrigger value="disciplinas">Disciplinas</TabsTrigger>
        </TabsList>

        <TabsContent value="hoje" className="mt-4 space-y-4">
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

        <TabsContent value="semana" className="mt-4 space-y-4">
          {proximosDias(hoje, 7).map((d) => (
            <Dia
              key={d}
              titulo={d === hoje ? `Hoje — ${formatarDia(d)}` : formatarDia(d)}
              blocos={doDia(d)}
              nomeDisciplina={nomeDisciplina}
              onMarcar={marcar.mutate}
              vazio="Dia livre."
            />
          ))}
        </TabsContent>

        <TabsContent value="mes" className="mt-4 space-y-3">
          {proximosDias(hoje, 30)
            .filter((d) => doDia(d).length > 0)
            .map((d) => (
              <Dia
                key={d}
                titulo={formatarDia(d)}
                blocos={doDia(d)}
                nomeDisciplina={nomeDisciplina}
                onMarcar={marcar.mutate}
                compacto
              />
            ))}
          {proximosDias(hoje, 30).every((d) => doDia(d).length === 0) && (
            <p className="text-sm text-muted-foreground">Nada programado nos próximos 30 dias.</p>
          )}
        </TabsContent>

        <TabsContent value="disciplinas" className="mt-4 space-y-3">
          {estado.disciplinas.map((d) => {
            const bs = blocos.filter((b) => b.disciplina_id === d.id);
            const total = bs.reduce((a, b) => a + b.minutos, 0);
            const feito = bs.filter((b) => b.concluido).reduce((a, b) => a + b.minutos, 0);
            const pct = total ? Math.round((feito / total) * 100) : 0;
            return (
              <div key={d.id} className="surface-card p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-medium">{d.nome}</p>
                  <span className="text-xs text-muted-foreground">
                    {bs.length ? `${formatarData(bs[0].data)} a ${formatarData(bs[bs.length - 1].data)}` : "—"}
                  </span>
                </div>
                <div className="mt-2 flex items-center gap-3">
                  <Progress value={pct} className="h-1.5" />
                  <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
                    {pct}% · {formatarMinutos(total)}
                  </span>
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
      className={`flex items-start gap-3 rounded-lg border p-4 text-sm ${
        tom === "alerta" ? "border-amber-500/40 bg-amber-500/10" : "border-primary/20 bg-primary/5"
      }`}
    >
      <Icon className="mt-0.5 h-4 w-4 shrink-0" />
      <p>{children}</p>
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
  compacto,
}: {
  titulo: string;
  blocos: Bloco[];
  nomeDisciplina: Map<string, string>;
  onMarcar: (v: { id: string; concluido: boolean }) => void;
  vazio?: string;
  mostrarData?: boolean;
  compacto?: boolean;
}) {
  const total = blocos.reduce((a, b) => a + b.minutos, 0);
  return (
    <section className={compacto ? "" : "surface-card p-4"}>
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">{titulo}</h3>
        {total > 0 && <span className="text-xs text-muted-foreground">{formatarMinutos(total)}</span>}
      </div>
      {blocos.length === 0 ? (
        vazio && <p className="mt-2 text-sm text-muted-foreground">{vazio}</p>
      ) : (
        <ul className="mt-3 space-y-2">
          {blocos.map((b) => (
            <li
              key={b.id}
              className="flex flex-wrap items-center gap-3 rounded-lg border border-border/60 px-3 py-2.5"
            >
              <Checkbox
                checked={b.concluido}
                aria-label={`Concluir ${b.titulo}`}
                onCheckedChange={(v) => onMarcar({ id: b.id, concluido: !!v })}
              />
              <div className="min-w-0 flex-1">
                <p className={`truncate text-sm font-medium ${b.concluido ? "text-muted-foreground line-through" : ""}`}>
                  {b.titulo}
                  {b.continuacao && <span className="text-xs text-muted-foreground"> (continuação)</span>}
                </p>
                <p className="text-xs text-muted-foreground">
                  {mostrarData && `${formatarDia(b.data)} · `}
                  {b.disciplina_id ? nomeDisciplina.get(b.disciplina_id) : null}
                  {b.disciplina_id ? " · " : ""}
                  {formatarMinutos(b.minutos)}
                </p>
              </div>
              <Badge variant={b.tipo === "revisao" ? "secondary" : "outline"}>{ROTULO_TIPO[b.tipo]}</Badge>
              <AcaoDoBloco bloco={b} />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function AcaoDoBloco({ bloco }: { bloco: Bloco }) {
  if (bloco.tipo === "estudo" && bloco.material_id) {
    return (
      <Button asChild size="sm" variant="outline">
        <Link to="/materiais/$materialId/leitura" params={{ materialId: bloco.material_id }}>
          <BookOpen className="mr-1 h-3.5 w-3.5" />
          Estudar
        </Link>
      </Button>
    );
  }
  if (bloco.tipo === "questoes" && bloco.material_id) {
    return (
      <Button asChild size="sm" variant="outline">
        <Link to="/materiais/$materialId/questoes" params={{ materialId: bloco.material_id }}>
          <ListChecks className="mr-1 h-3.5 w-3.5" />
          Resolver
        </Link>
      </Button>
    );
  }
  if (bloco.tipo === "revisao") {
    return <span className="text-xs text-muted-foreground">Conteúdo ao concluir a disciplina</span>;
  }
  if (bloco.tipo === "simulado") {
    return <span className="text-xs text-muted-foreground">Em breve</span>;
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
