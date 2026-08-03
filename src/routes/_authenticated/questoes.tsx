import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { PageContent, PageHeader, EmptyState } from "@/components/page";
import { Input } from "@/components/ui/input";
import { HelpCircle } from "lucide-react";
import { alunoListMateriaisComProgresso } from "@/lib/questoes.functions";
import { MaterialRow } from "@/components/material-row";

export const Route = createFileRoute("/_authenticated/questoes")({
  head: () => ({
    meta: [
      { title: "Prática Dirigida — Questões | Instituto J&D" },
      {
        name: "description",
        content:
          "Resolva questões vinculadas a cada material em PDF, com correção imediata e comentário do professor.",
      },
      { property: "og:title", content: "Prática Dirigida — Questões | Instituto J&D" },
      {
        property: "og:description",
        content: "Materiais com questões disponíveis, correção imediata e histórico de desempenho.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: QuestoesAluno,
});

function QuestoesAluno() {
  const fetchFn = useServerFn(alunoListMateriaisComProgresso);
  const q = useQuery({ queryKey: ["aluno", "acervo"], queryFn: () => fetchFn() });
  const [busca, setBusca] = useState("");

  const termo = busca.trim().toLowerCase();
  const itens = (q.data ?? [])
    .filter((m: any) => m.total_questoes > 0)
    .filter(
      (m: any) =>
        !termo ||
        m.titulo.toLowerCase().includes(termo) ||
        (m.disciplina ?? "").toLowerCase().includes(termo),
    );

  return (
    <>
      <PageHeader
        title="Questões"
        description="Materiais com prática dirigida disponível."
        actions={
          <Input
            placeholder="Buscar material ou disciplina…"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            className="w-56"
          />
        }
      />
      <PageContent>
        {q.isLoading ? (
          <div className="text-sm text-muted-foreground">Carregando…</div>
        ) : itens.length === 0 ? (
          <EmptyState
            icon={HelpCircle}
            title="Nenhuma questão disponível"
            description="As questões são cadastradas por material e aparecerão aqui em breve."
          />
        ) : (
          <div className="space-y-2">
            {itens.map((m: any) => (
              <MaterialRow key={m.id} m={m} />
            ))}
          </div>
        )}
      </PageContent>
    </>
  );
}
