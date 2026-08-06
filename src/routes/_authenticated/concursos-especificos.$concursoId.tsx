import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { PageContent, PageHeader, EmptyState } from "@/components/page";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { BookMarked, FileText, ArrowLeft, ExternalLink } from "lucide-react";
import { alunoGetConcursoEspecifico } from "@/lib/disciplinas-especificas.functions";

export const Route = createFileRoute("/_authenticated/concursos-especificos/$concursoId")({
  head: () => ({
    meta: [
      { title: "Disciplinas do concurso — Instituto J&D" },
      {
        name: "description",
        content:
          "Disciplinas específicas do edital, com os materiais exclusivos que não fazem parte do Acervo Base.",
      },
      { property: "og:title", content: "Disciplinas do concurso — Instituto J&D" },
      {
        property: "og:description",
        content: "Materiais exclusivos do edital, separados do Acervo Base.",
      },
    ],
  }),
  component: ConcursoEspecifico,
});

function ConcursoEspecifico() {
  const { concursoId } = Route.useParams();
  const fn = useServerFn(alunoGetConcursoEspecifico);
  const q = useQuery({
    queryKey: ["concurso-especifico", concursoId],
    queryFn: () => fn({ data: { concurso_id: concursoId } }),
  });

  const concurso: any = q.data?.concurso;
  const disciplinas: any[] = q.data?.disciplinas ?? [];

  return (
    <>
      <PageHeader
        title={concurso?.nome ?? "Concurso"}
        description="Disciplinas específicas deste edital. O conteúdo fixo continua no Acervo Base."
        actions={
          <Button variant="outline" asChild>
            <Link to="/cronogramas">
              <ArrowLeft className="mr-1 h-4 w-4" />
              Voltar ao Cronograma
            </Link>
          </Button>
        }
      />
      <PageContent>
        {q.isLoading ? (
          <div className="text-sm text-muted-foreground">Carregando…</div>
        ) : q.error ? (
          <EmptyState
            icon={BookMarked}
            title="Conteúdo indisponível"
            description={(q.error as Error).message}
          />
        ) : (
          <div className="space-y-6">
            {concurso?.edital_url && (
              <a
                href={concurso.edital_url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline"
              >
                <ExternalLink className="h-4 w-4" />
                Abrir edital
              </a>
            )}

            {disciplinas.length === 0 ? (
              <EmptyState
                icon={BookMarked}
                title="Nenhuma disciplina específica publicada"
                description="Assim que o material do edital for liberado, ele aparece aqui."
              />
            ) : (
              disciplinas.map((d) => (
                <section key={d.id} className="surface-card p-5">
                  <h2 className="text-sm font-semibold">{d.nome}</h2>
                  {d.descricao && (
                    <p className="mt-1 text-xs text-muted-foreground">{d.descricao}</p>
                  )}
                  <div className="mt-4 grid gap-3 md:grid-cols-2">
                    {d.materiais.length === 0 ? (
                      <p className="text-xs text-muted-foreground">
                        Materiais desta disciplina em preparação.
                      </p>
                    ) : (
                      d.materiais.map((m: any) => (
                        <div
                          key={m.id}
                          className="rounded-md border border-border/60 p-4 transition-colors hover:border-primary/40"
                        >
                          <div className="flex items-start gap-2">
                            <FileText className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                            <div className="min-w-0">
                              <p className="truncate text-sm font-medium">{m.titulo}</p>
                              {m.descricao && (
                                <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
                                  {m.descricao}
                                </p>
                              )}
                            </div>
                            <Badge variant="secondary" className="ml-auto shrink-0">
                              v{m.versao}
                            </Badge>
                          </div>
                          <div className="mt-3 flex flex-wrap gap-2">
                            <Button size="sm" asChild>
                              <Link
                                to="/materiais/$materialId/pdf"
                                params={{ materialId: m.id }}
                              >
                                Visualizar PDF
                              </Link>
                            </Button>
                            <Button size="sm" variant="outline" asChild>
                              <Link
                                to="/materiais/$materialId/questoes"
                                params={{ materialId: m.id }}
                              >
                                Resolver questões
                              </Link>
                            </Button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </section>
              ))
            )}
          </div>
        )}
      </PageContent>
    </>
  );
}
