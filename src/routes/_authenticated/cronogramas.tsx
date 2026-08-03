import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { PageContent, PageHeader, EmptyState } from "@/components/page";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CalendarDays, FileText } from "lucide-react";
import { alunoListCronogramas } from "@/lib/cronogramas.functions";

export const Route = createFileRoute("/_authenticated/cronogramas")({
  head: () => ({
    meta: [
      { title: "Cronogramas de Estudo — Portal do Aluno | Instituto J&D" },
      {
        name: "description",
        content:
          "Planos de estudo dia a dia do Instituto J&D, com os materiais em PDF na ordem recomendada.",
      },
      { property: "og:title", content: "Cronogramas de Estudo — Portal do Aluno" },
      {
        property: "og:description",
        content: "Siga o plano diário de estudos e abra cada material direto do cronograma.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: CronogramasAluno,
});

function CronogramasAluno() {
  const fetchFn = useServerFn(alunoListCronogramas);
  const q = useQuery({ queryKey: ["aluno", "cronogramas"], queryFn: () => fetchFn() });
  const cronos = q.data ?? [];

  return (
    <>
      <PageHeader
        title="Cronogramas"
        description="Planos de estudo organizados dia a dia pela equipe do Instituto."
      />
      <PageContent>
        {q.isLoading ? (
          <div className="text-sm text-muted-foreground">Carregando…</div>
        ) : cronos.length === 0 ? (
          <EmptyState
            icon={CalendarDays}
            title="Nenhum cronograma publicado"
            description="Assim que um plano de estudos for liberado, ele aparecerá aqui."
          />
        ) : (
          <div className="space-y-6">
            {cronos.map((c: any) => {
              const dias = [...new Set(c.itens.map((i: any) => i.dia))].sort(
                (a: any, b: any) => a - b,
              );
              return (
                <section key={c.id} className="surface-card p-5">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-sm font-semibold">{c.nome}</h2>
                    {c.contexto && (
                      <Badge variant="secondary" className="text-xs">
                        {c.contexto}
                      </Badge>
                    )}
                  </div>
                  {c.descricao && (
                    <p className="mt-1 text-xs text-muted-foreground">{c.descricao}</p>
                  )}

                  {dias.length === 0 ? (
                    <p className="mt-4 text-xs text-muted-foreground">
                      Este cronograma ainda não possui itens.
                    </p>
                  ) : (
                    <div className="mt-4 space-y-4">
                      {dias.map((dia: any) => (
                        <div key={dia}>
                          <p className="text-eyebrow mb-2">Dia {dia}</p>
                          <div className="space-y-2">
                            {c.itens
                              .filter((i: any) => i.dia === dia)
                              .map((i: any) => (
                                <div
                                  key={i.id}
                                  className="flex flex-col gap-2 rounded-md border border-border/60 p-3 sm:flex-row sm:items-center sm:justify-between"
                                >
                                  <div className="min-w-0">
                                    <p className="truncate text-sm font-medium">{i.titulo}</p>
                                    {i.observacoes && (
                                      <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
                                        {i.observacoes}
                                      </p>
                                    )}
                                  </div>
                                  {i.material_id && (
                                    <Button asChild variant="outline" size="sm">
                                      <Link
                                        to="/materiais/$materialId/pdf"
                                        params={{ materialId: i.material_id }}
                                      >
                                        <FileText className="mr-1 h-3.5 w-3.5" />
                                        Abrir PDF
                                      </Link>
                                    </Button>
                                  )}
                                </div>
                              ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </section>
              );
            })}
          </div>
        )}
      </PageContent>
    </>
  );
}
