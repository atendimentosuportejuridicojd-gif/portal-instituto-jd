import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { PageContent, PageHeader, EmptyState } from "@/components/page";
import { Button } from "@/components/ui/button";
import { ArrowLeft, BookOpen } from "lucide-react";
import { alunoListMateriaisComProgresso } from "@/lib/questoes.functions";
import { MaterialRow } from "@/components/material-row";

export const Route = createFileRoute("/_authenticated/acervo/$disciplinaId")({
  head: () => ({
    meta: [
      { title: "Materiais da disciplina — Acervo Base | Instituto J&D" },
      {
        name: "description",
        content:
          "Materiais em PDF da disciplina selecionada, com leitor in-app, questões e desempenho.",
      },
      { property: "og:title", content: "Materiais da disciplina — Acervo Base" },
      {
        property: "og:description",
        content: "Abra o PDF, resolva as questões e acompanhe seu desempenho.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AcervoDisciplina,
});

function AcervoDisciplina() {
  const { disciplinaId } = Route.useParams();
  const fetchFn = useServerFn(alunoListMateriaisComProgresso);
  const q = useQuery({ queryKey: ["aluno", "acervo"], queryFn: () => fetchFn() });

  const todos = q.data ?? [];
  const items = todos.filter(
    (m: any) => (m.disciplina_id ?? "sem-disciplina") === disciplinaId,
  );
  const nome = items[0]?.disciplina ?? "Disciplina";

  return (
    <>
      <PageHeader
        title={q.isLoading ? "Carregando…" : nome}
        description="Materiais em PDF desta disciplina."
        actions={
          <Button asChild variant="ghost" size="sm">
            <Link to="/acervo">
              <ArrowLeft className="mr-1 h-3.5 w-3.5" />
              Disciplinas
            </Link>
          </Button>
        }
      />
      <PageContent>
        {q.isLoading ? (
          <div className="text-sm text-muted-foreground">Carregando…</div>
        ) : items.length === 0 ? (
          <EmptyState
            icon={BookOpen}
            title="Nenhum material nesta disciplina"
            description="Os materiais serão publicados em breve."
          />
        ) : (
          <div className="space-y-2">
            {items.map((m: any) => (
              <MaterialRow key={m.id} m={m} />
            ))}
          </div>
        )}
      </PageContent>
    </>
  );
}
