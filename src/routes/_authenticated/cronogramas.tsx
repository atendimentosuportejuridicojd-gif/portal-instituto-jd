import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { CalendarDays, Loader2 } from "lucide-react";
import { PageContent, PageHeader, EmptyState } from "@/components/page";
import { Button } from "@/components/ui/button";
import { Assistente } from "@/components/cronograma/assistente";
import { PlanoDoAluno } from "@/components/cronograma/plano";
import { ExcluirCronograma } from "@/components/cronograma/excluir";
import {
  alunoCronogramaAtual,
  alunoDadosAssistente,
  alunoFinalizarRascunho,
} from "@/lib/cronograma-aluno.functions";
import { alunoAtivarSimulados } from "@/lib/simulado-aluno.functions";

export const Route = createFileRoute("/_authenticated/cronogramas")({
  head: () => ({
    meta: [
      { title: "Meu Cronograma J&D — Portal do Aluno | Instituto J&D" },
      {
        name: "description",
        content:
          "Monte o seu cronograma de estudos pelo Método J&D: uma disciplina por vez, revisão pelas questões e a data da sua prova como referência.",
      },
      { property: "og:title", content: "Meu Cronograma J&D — Portal do Aluno" },
      {
        property: "og:description",
        content: "Do primeiro dia até a véspera da prova, com o seu tempo e o seu ritmo.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: MeuCronograma,
});

function MeuCronograma() {
  const qc = useQueryClient();
  const atualFn = useServerFn(alunoCronogramaAtual);
  const dadosFn = useServerFn(alunoDadosAssistente);
  const finalizarFn = useServerFn(alunoFinalizarRascunho);
  const [criando, setCriando] = useState(false);

  const q = useQuery({
    queryKey: ["aluno", "cronograma"],
    queryFn: () => atualFn(),
    // Enquanto espera a confirmação do pagamento dos simulados, confere a cada 5 segundos.
    refetchInterval: (query) => (query.state.data?.rascunho && !query.state.data?.cronograma ? 5000 : false),
  });

  const precisaAssistente = criando || (!!q.data && !q.data.cronograma);
  const dadosQ = useQuery({
    queryKey: ["aluno", "assistente"],
    queryFn: () => dadosFn(),
    enabled: precisaAssistente,
  });

  // Voltou do pagamento: se o acesso aos simulados já está liberado, ativa o rascunho.
  const finalizar = useMutation({
    mutationFn: () => finalizarFn(),
    onSuccess: (r: any) => {
      if (r?.estado === "ativo") toast.success("Pagamento confirmado! Seu cronograma está ativo.");
      qc.invalidateQueries({ queryKey: ["aluno", "cronograma"] });
    },
    onError: (e: any) => toast.error(e.message),
  });
  const tentou = useRef(false);
  useEffect(() => {
    if (q.data?.rascunho && q.data.simuladoLiberado && !tentou.current && !finalizar.isPending) {
      tentou.current = true;
      finalizar.mutate();
    }
  }, [q.data, finalizar]);

  // Voltou do pagamento dos simulados com o cronograma já ativo: inclui os simulados no plano.
  const ativarFn = useServerFn(alunoAtivarSimulados);
  const ativarSimulados = useMutation({
    mutationFn: () => ativarFn({ data: {} }),
    onSuccess: (r: any) => {
      if (r?.estado === "ativo") toast.success("Simulados incluídos no seu cronograma.");
      qc.invalidateQueries({ queryKey: ["aluno"] });
    },
    onError: (e: any) => toast.error(e.message),
  });
  const tentouSimulados = useRef(false);
  useEffect(() => {
    const c = q.data?.cronograma;
    if (c && q.data?.simuladoLiberado && !c.usa_simulado && c.duracao_prova_min && !tentouSimulados.current) {
      tentouSimulados.current = true;
      ativarSimulados.mutate();
    }
  }, [q.data, ativarSimulados]);

  const aoCriar = () => {
    setCriando(false);
    qc.invalidateQueries({ queryKey: ["aluno", "cronograma"] });
  };

  let conteudo: React.ReactNode;
  if (q.isLoading) {
    conteudo = <div className="text-sm text-muted-foreground">Carregando…</div>;
  } else if (q.error) {
    conteudo = (
      <EmptyState icon={CalendarDays} title="Cronograma indisponível" description={(q.error as Error).message} />
    );
  } else if (q.data?.cronograma && !criando) {
    conteudo = <PlanoDoAluno estado={q.data as any} onNovo={() => setCriando(true)} />;
  } else if (q.data?.rascunho && !criando) {
    conteudo = (
      <div className="surface-card mx-auto flex max-w-xl flex-col items-center gap-3 p-8 text-center">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        <h2 className="text-base font-semibold">Aguardando a confirmação do pagamento</h2>
        <p className="text-sm text-muted-foreground">
          Seu cronograma de <strong>{q.data.rascunho.concurso_nome}</strong> será ativado assim que o pagamento dos
          simulados for confirmado. Isso costuma levar alguns instantes.
        </p>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => qc.invalidateQueries({ queryKey: ["aluno", "cronograma"] })}>
            Verificar agora
          </Button>
          <Button variant="ghost" onClick={() => setCriando(true)}>
            Montar outro cronograma
          </Button>
          <ExcluirCronograma status="rascunho" nome={q.data.rascunho.concurso_nome} />
        </div>
      </div>
    );
  } else if (dadosQ.isLoading || !dadosQ.data) {
    conteudo = dadosQ.error ? (
      <EmptyState icon={CalendarDays} title="Não foi possível carregar" description={(dadosQ.error as Error).message} />
    ) : (
      <div className="text-sm text-muted-foreground">Carregando…</div>
    );
  } else {
    conteudo = (
      <Assistente
        dados={dadosQ.data as any}
        rascunho={q.data?.rascunho ?? null}
        onCriado={aoCriar}
        onCancelar={q.data?.cronograma ? () => setCriando(false) : undefined}
      />
    );
  }

  return (
    <>
      <PageHeader
        title="Meu Cronograma"
        description="Pelo Método J&D: uma disciplina por vez, revisão pelas questões e a data da prova como referência."
      />
      <PageContent>{conteudo}</PageContent>
    </>
  );
}
