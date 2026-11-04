import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { PageContent, PageHeader, EmptyState } from "@/components/page";
import { Target, ChevronRight, Library } from "lucide-react";
import { alunoListTrilhas } from "@/lib/trilhas.functions";
import { ESFERAS } from "@/lib/esferas";

export const Route = createFileRoute("/_authenticated/acervo/")({
  head: () => ({
    meta: [
      { title: "Acervo Base — Escolha o cargo | Instituto J&D" },
      {
        name: "description",
        content:
          "Selecione o cargo desejado no Acervo Base do Instituto J&D e acesse as disciplinas específicas daquela preparação.",
      },
      { property: "og:title", content: "Acervo Base — Escolha o cargo | Instituto J&D" },
      {
        property: "og:description",
        content: "Cargos disponíveis no Acervo Base: escolha um para ver as disciplinas.",
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
  const ids = new Set(cargos.map((c: any) => c.id));
  // Órgãos (sem pai) com seus cargos (subtrilhas) agrupados; sem filhas, o próprio órgão é o cargo.
  const grupos = cargos
    .filter((c: any) => !c.trilha_pai_id || !ids.has(c.trilha_pai_id))
    .map((pai: any) => ({
      pai,
      filhas: cargos.filter((c: any) => c.trilha_pai_id === pai.id),
    }));
  // Seções por esfera (Federal, Estadual, Municipal). Trilha de mais de uma esfera aparece em cada uma;
  // trilha sem esfera cai em "Outras". Se nenhuma trilha tem esfera, não mostra títulos de esfera.
  const secoes = [...ESFERAS.map((e) => ({ id: e.id as string, nome: e.nome })), { id: "sem", nome: "Outras" }]
    .map((sec) => ({
      ...sec,
      grupos: grupos.filter((g: any) =>
        sec.id === "sem" ? (g.pai.esferas ?? []).length === 0 : (g.pai.esferas ?? []).includes(sec.id),
      ),
    }))
    .filter((sec) => sec.grupos.length > 0);
  const mostrarEsfera = secoes.some((sec) => sec.id !== "sem");

  return (
    <>
      <PageHeader
        icone={Library}
        rotulo="Biblioteca do Instituto"
        title="Acervo Base"
        description="Escolha o cargo para ver apenas as disciplinas daquela preparação."
      />
      <PageContent>
        {q.isLoading ? (
          <div className="text-sm text-muted-foreground">Carregando…</div>
        ) : (
          <div className="space-y-6">
            {secoes.map((sec) => {
              const comCargos = sec.grupos.filter((g: any) => g.filhas.length > 0);
              const diretos = sec.grupos.filter((g: any) => g.filhas.length === 0);
              return (
                <section key={sec.id} className="space-y-4">
                  {mostrarEsfera && (
                    <h2 className="border-b border-border/60 pb-1.5 text-base font-semibold">{sec.nome}</h2>
                  )}
                  {comCargos.map((g: any) => (
                    <div key={g.pai.id} className="space-y-3">
                      <h3 className="text-sm font-semibold text-muted-foreground">{g.pai.nome}</h3>
                      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                        {g.filhas.map((c: any) => (
                          <CargoCard key={c.id} c={c} />
                        ))}
                      </div>
                    </div>
                  ))}
                  {diretos.length > 0 && (
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                      {diretos.map((g: any) => (
                        <CargoCard key={g.pai.id} c={g.pai} />
                      ))}
                    </div>
                  )}
                </section>
              );
            })}

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <Link
              to="/acervo/$cargoId"
              params={{ cargoId: "todos" }}
              className="surface-card group flex items-center justify-between gap-4 p-5 hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md"
            >
              <div className="min-w-0">
                <div className="mb-3 grid h-11 w-11 place-items-center rounded-xl bg-gradient-to-br from-primary/15 to-gold/25 text-primary">
                  <Library className="h-5 w-5" />
                </div>
                <h2 className="truncate text-sm font-semibold">Acervo completo</h2>
                <p className="mt-1 text-xs text-muted-foreground">
                  Todas as disciplinas disponíveis, sem filtro de cargo.
                </p>
              </div>
              <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
            </Link>
            </div>
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

function CargoCard({ c }: { c: any }) {
  const disciplinas = new Set(c.materiais.map((m: any) => m.disciplina));
  return (
    <Link
      to="/acervo/$cargoId"
      params={{ cargoId: c.id }}
      className="surface-card group flex items-center justify-between gap-4 p-5 hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md"
    >
      <div className="min-w-0">
        <div className="mb-3 grid h-11 w-11 place-items-center rounded-xl bg-gradient-to-br from-primary/15 to-gold/25 text-primary">
          <Target className="h-5 w-5" />
        </div>
        <h2 className="truncate text-sm font-semibold">{c.nome}</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          {disciplinas.size} {disciplinas.size === 1 ? "disciplina" : "disciplinas"} · {c.materiais.length} material(is)
        </p>
      </div>
      <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
    </Link>
  );
}
