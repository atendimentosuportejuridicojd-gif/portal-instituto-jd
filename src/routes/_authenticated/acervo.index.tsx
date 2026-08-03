import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { PageContent, PageHeader, EmptyState } from "@/components/page";
import { BookOpen, FolderOpen, ChevronRight } from "lucide-react";
import { alunoListMateriaisComProgresso } from "@/lib/questoes.functions";

export const Route = createFileRoute("/_authenticated/acervo/")({
  head: () => ({
    meta: [
      { title: "Acervo Base — Portal do Aluno | Instituto J&D" },
      {
        name: "description",
        content:
          "Disciplinas do Acervo Base do Instituto J&D: escolha uma disciplina para acessar os materiais em PDF.",
      },
      { property: "og:title", content: "Acervo Base — Portal do Aluno | Instituto J&D" },
      {
        property: "og:description",
        content: "Biblioteca principal organizada por disciplinas, com PDFs e questões.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AcervoDisciplinas,
});

function AcervoDisciplinas() {
  const fetchFn = useServerFn(alunoListMateriaisComProgresso);
  const q = useQuery({ queryKey: ["aluno", "acervo"], queryFn: () => fetchFn() });

  const materiais = q.data ?? [];
  const mapa = new Map<string, { id: string; nome: string; total: number; novos: number }>();
  materiais.forEach((m: any) => {
    const id = m.disciplina_id ?? "sem-disciplina";
    const atual = mapa.get(id) ?? { id, nome: m.disciplina, total: 0, novos: 0 };
    atual.total += 1;
    if (m.novo || m.atualizado) atual.novos += 1;
    mapa.set(id, atual);
  });
  const disciplinas = [...mapa.values()].sort((a, b) => a.nome.localeCompare(b.nome));

  return (
    <>
      <PageHeader
        title="Acervo Base"
        description="Escolha uma disciplina para ver os materiais em PDF."
      />
      <PageContent>
        {q.isLoading ? (
          <div className="text-sm text-muted-foreground">Carregando…</div>
        ) : disciplinas.length === 0 ? (
          <EmptyState
            icon={BookOpen}
            title="Acervo em preparação"
            description="Os materiais serão publicados em breve."
          />
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {disciplinas.map((d) => (
              <Link
                key={d.id}
                to="/acervo/$disciplinaId"
                params={{ disciplinaId: d.id }}
                className="surface-card group flex items-center justify-between gap-4 p-5 transition-shadow hover:shadow-md"
              >
                <div className="min-w-0">
                  <div className="mb-3 grid h-10 w-10 place-items-center rounded-md bg-muted">
                    <FolderOpen className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <h2 className="truncate text-sm font-semibold">{d.nome}</h2>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {d.total} {d.total === 1 ? "material" : "materiais"}
                    {d.novos > 0 ? ` · ${d.novos} novo(s)` : ""}
                  </p>
                </div>
                <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
              </Link>
            ))}
          </div>
        )}
      </PageContent>
    </>
  );
}
