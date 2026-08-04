import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { PageContent, PageHeader, EmptyState } from "@/components/page";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Target, FileText, ListChecks } from "lucide-react";
import { alunoListTrilhas } from "@/lib/trilhas.functions";

export const Route = createFileRoute("/_authenticated/trilhas")({
  head: () => ({
    meta: [
      { title: "Trilhas de Preparação — Portal do Aluno J&D" },
      {
        name: "description",
        content: "Siga a trilha de Técnico ou Analista Judiciário com os materiais na ordem ideal de estudo.",
      },
      { property: "og:title", content: "Trilhas de Preparação — Portal do Aluno J&D" },
      { property: "og:description", content: "Estude na sequência recomendada pelo Instituto J&D." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: TrilhasPage,
});

function TrilhasPage() {
  const listFn = useServerFn(alunoListTrilhas);
  const q = useQuery({ queryKey: ["trilhas"], queryFn: () => listFn() });
  const trilhas = q.data ?? [];

  return (
    <>
      <PageHeader
        title="Trilhas de Preparação"
        description="Roteiros de estudo organizados na sequência recomendada pelos professores."
      />
      <PageContent>
        {q.isLoading ? (
          <div className="text-sm text-muted-foreground">Carregando…</div>
        ) : trilhas.length === 0 ? (
          <EmptyState
            icon={Target}
            title="Trilhas em preparação"
            description="Assim que as trilhas forem publicadas, elas aparecerão aqui."
          />
        ) : (
          <div className="space-y-6">
            {trilhas.map((t: any) => (
              <section key={t.id} className="surface-card p-5">
                <h2 className="text-base font-semibold tracking-tight">{t.nome}</h2>
                {t.descricao && <p className="mt-1 text-sm text-muted-foreground">{t.descricao}</p>}
                <p className="mt-1 text-xs text-muted-foreground">
                  {t.materiais.length} material(is) nesta trilha
                </p>

                {t.materiais.length === 0 ? (
                  <p className="mt-4 text-sm text-muted-foreground">
                    Materiais desta trilha serão liberados em breve.
                  </p>
                ) : (
                  <div className="mt-4 space-y-5">
                    {agruparPorDisciplina(t.materiais).map((grupo) => (
                      <div key={grupo.disciplina}>
                        <p className="text-eyebrow mb-2">{grupo.disciplina}</p>
                        <ul className="space-y-2">
                          {grupo.materiais.map((m: any, i: number) => (
                            <li
                              key={m.id}
                              className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border/60 px-3 py-2.5"
                            >
                              <div className="min-w-0">
                                <p className="truncate text-sm font-medium">
                                  <span className="mr-2 text-xs text-muted-foreground">{i + 1}.</span>
                                  {m.titulo}
                                </p>
                              </div>
                              <div className="flex items-center gap-2">
                                {!m.tem_arquivo && <Badge variant="outline">Em breve</Badge>}
                                {m.tem_arquivo && (
                                  <Button asChild size="sm" variant="outline">
                                    <Link to="/materiais/$materialId/pdf" params={{ materialId: m.id }}>
                                      <FileText className="mr-1 h-3.5 w-3.5" />
                                      Visualizar PDF
                                    </Link>
                                  </Button>
                                )}
                                <Button asChild size="sm" variant="ghost">
                                  <Link
                                    to="/materiais/$materialId/questoes"
                                    params={{ materialId: m.id }}
                                  >
                                    <ListChecks className="mr-1 h-3.5 w-3.5" />
                                    Questões
                                  </Link>
                                </Button>
                              </div>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            ))}
          </div>
        )}
      </PageContent>
    </>
  );
}
