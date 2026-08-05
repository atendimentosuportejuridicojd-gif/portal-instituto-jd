import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { PageContent, PageHeader, EmptyState } from "@/components/page";
import { Button } from "@/components/ui/button";
import { ArrowLeft, BookOpen } from "lucide-react";
import { alunoListTrilhas } from "@/lib/trilhas.functions";
import { alunoListMateriaisComProgresso } from "@/lib/questoes.functions";
import { MaterialRow } from "@/components/material-row";

export const Route = createFileRoute("/_authenticated/acervo/$cargoId/$disciplinaId")({
  head: () => ({
    meta: [
      { title: "Materiais da matéria — Acervo Base | Instituto J&D" },
      {
        name: "description",
        content:
          "Materiais em PDF da matéria selecionada, com leitor in-app, marcação de leitura, questões e desempenho.",
      },
      { property: "og:title", content: "Materiais da matéria — Acervo Base" },
      {
        property: "og:description",
        content: "Abra o PDF, marque como lido, resolva as questões e acompanhe seu desempenho.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: CargoDisciplinaMateriais,
});

function CargoDisciplinaMateriais() {
  const { cargoId, disciplinaId } = Route.useParams();
  const cargosFn = useServerFn(alunoListTrilhas);
  const matsFn = useServerFn(alunoListMateriaisComProgresso);

  const qCargos = useQuery({ queryKey: ["aluno", "cargos"], queryFn: () => cargosFn() });
  const qMats = useQuery({ queryKey: ["aluno", "acervo"], queryFn: () => matsFn() });

  const todos = cargoId === "todos";
  const cargo = (qCargos.data ?? []).find((c: any) => c.id === cargoId);
  const permitidos = new Set<string>((cargo?.materiais ?? []).map((m: any) => m.id));

  const items = (qMats.data ?? [])
    .filter((m: any) => todos || permitidos.has(m.id))
    .filter((m: any) => (m.disciplina_id ?? "sem-disciplina") === disciplinaId);

  const nome = items[0]?.disciplina ?? "Matéria";
  const loading = qCargos.isLoading || qMats.isLoading;

  return (
    <>
      <PageHeader
        title={loading ? "Carregando…" : nome}
        description={todos ? "Materiais em PDF desta matéria." : `Materiais desta matéria em ${cargo?.nome ?? "cargo"}.`}
        actions={
          <Button asChild variant="ghost" size="sm">
            <Link to="/acervo/$cargoId" params={{ cargoId }}>
              <ArrowLeft className="mr-1 h-3.5 w-3.5" />
              Matérias
            </Link>
          </Button>
        }
      />
      <PageContent>
        {loading ? (
          <div className="text-sm text-muted-foreground">Carregando…</div>
        ) : items.length === 0 ? (
          <EmptyState
            icon={BookOpen}
            title="Nenhum material nesta matéria"
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
