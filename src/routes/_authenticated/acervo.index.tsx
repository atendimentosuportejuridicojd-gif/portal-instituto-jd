import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { PageContent, PageHeader, EmptyState } from "@/components/page";
import { Target, ChevronRight, Library } from "lucide-react";
import { alunoListTrilhas } from "@/lib/trilhas.functions";

export const Route = createFileRoute("/_authenticated/acervo/")({
  head: () => ({
    meta: [
      { title: "Acervo Base — Escolha o cargo | Instituto J&D" },
      {
        name: "description",
        content:
          "Selecione o cargo desejado no Acervo Base do Instituto J&D e acesse as matérias específicas daquela preparação.",
      },
      { property: "og:title", content: "Acervo Base — Escolha o cargo | Instituto J&D" },
      {
        property: "og:description",
        content: "Cargos disponíveis no Acervo Base: escolha um para ver as matérias.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AcervoCargos,
});

function AcervoCargos() {
  const fetchFn = useServerFn(alunoListTrilhas);
  const q = useQuery({ queryKey: ["aluno", "cargos"], queryFn: () => fetchFn() });
  const cargos = q.data ?? [];

  return (
    <>
      <PageHeader
        title="Acervo Base"
        description="Escolha o cargo para ver apenas as matérias daquela preparação."
      />
      <PageContent>
        {q.isLoading ? (
          <div className="text-sm text-muted-foreground">Carregando…</div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {cargos.map((c: any) => {
              const disciplinas = new Set(c.materiais.map((m: any) => m.disciplina));
              return (
                <Link
                  key={c.id}
                  to="/acervo/$cargoId"
                  params={{ cargoId: c.id }}
                  className="surface-card group flex items-center justify-between gap-4 p-5 transition-shadow hover:shadow-md"
                >
                  <div className="min-w-0">
                    <div className="mb-3 grid h-10 w-10 place-items-center rounded-md bg-muted">
                      <Target className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <h2 className="truncate text-sm font-semibold">{c.nome}</h2>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {disciplinas.size} {disciplinas.size === 1 ? "matéria" : "matérias"} ·{" "}
                      {c.materiais.length} material(is)
                    </p>
                  </div>
                  <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
                </Link>
              );
            })}

            <Link
              to="/acervo/$cargoId"
              params={{ cargoId: "todos" }}
              className="surface-card group flex items-center justify-between gap-4 p-5 transition-shadow hover:shadow-md"
            >
              <div className="min-w-0">
                <div className="mb-3 grid h-10 w-10 place-items-center rounded-md bg-muted">
                  <Library className="h-5 w-5 text-muted-foreground" />
                </div>
                <h2 className="truncate text-sm font-semibold">Acervo completo</h2>
                <p className="mt-1 text-xs text-muted-foreground">
                  Todas as matérias disponíveis, sem filtro de cargo.
                </p>
              </div>
              <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
            </Link>
          </div>
        )}

        {!q.isLoading && cargos.length === 0 && (
          <div className="mt-4">
            <EmptyState
              icon={Target}
              title="Cargos em preparação"
              description="Assim que os cargos forem publicados, eles aparecerão aqui. Use o acervo completo enquanto isso."
            />
          </div>
        )}
      </PageContent>
    </>
  );
}
