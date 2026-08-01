import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { PageContent, PageHeader, EmptyState } from "@/components/page";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Gavel, FileText, ListChecks, ExternalLink } from "lucide-react";
import { alunoListConcursos } from "@/lib/trilhas.functions";

export const Route = createFileRoute("/_authenticated/concursos")({
  head: () => ({
    meta: [
      { title: "Concursos Específicos — Portal do Aluno J&D" },
      {
        name: "description",
        content: "Materiais organizados por edital: tribunais, ministérios públicos e demais carreiras judiciárias.",
      },
      { property: "og:title", content: "Concursos Específicos — Portal do Aluno J&D" },
      { property: "og:description", content: "Prepare-se com o material exato do seu edital." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ConcursosPage,
});

function ConcursosPage() {
  const listFn = useServerFn(alunoListConcursos);
  const q = useQuery({ queryKey: ["concursos"], queryFn: () => listFn() });
  const concursos = q.data ?? [];

  return (
    <>
      <PageHeader
        title="Concursos Específicos"
        description="Cada concurso reúne os materiais do acervo previstos no edital, além de conteúdos exclusivos."
      />
      <PageContent>
        {q.isLoading ? (
          <div className="text-sm text-muted-foreground">Carregando…</div>
        ) : concursos.length === 0 ? (
          <EmptyState
            icon={Gavel}
            title="Nenhum concurso publicado"
            description="Assim que novos editais forem mapeados, você verá os materiais aqui."
          />
        ) : (
          <div className="space-y-6">
            {concursos.map((c: any) => (
              <section key={c.id} className="surface-card p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h2 className="truncate text-base font-semibold tracking-tight">{c.nome}</h2>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {[c.orgao, c.banca, c.estado, c.ano].filter(Boolean).join(" · ") ||
                        "Detalhes em breve"}
                    </p>
                  </div>
                  {c.edital_url && (
                    <Button asChild size="sm" variant="outline">
                      <a href={c.edital_url} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="mr-1 h-3.5 w-3.5" />
                        Edital
                      </a>
                    </Button>
                  )}
                </div>

                {c.observacoes && (
                  <p className="mt-3 text-sm text-muted-foreground">{c.observacoes}</p>
                )}

                {c.materiais.length === 0 ? (
                  <p className="mt-4 text-sm text-muted-foreground">
                    Materiais deste concurso serão liberados em breve.
                  </p>
                ) : (
                  <ul className="mt-4 space-y-2">
                    {c.materiais.map((m: any) => (
                      <li
                        key={m.id}
                        className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border/60 px-3 py-2.5"
                      >
                        <div className="min-w-0">
                          <p className="flex items-center gap-2 truncate text-sm font-medium">
                            {m.titulo}
                            {m.exclusivo && <Badge variant="secondary">Exclusivo</Badge>}
                          </p>
                          <p className="text-xs text-muted-foreground">{m.disciplina}</p>
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
                            <Link to="/materiais/$materialId/questoes" params={{ materialId: m.id }}>
                              <ListChecks className="mr-1 h-3.5 w-3.5" />
                              Questões
                            </Link>
                          </Button>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            ))}
          </div>
        )}
      </PageContent>
    </>
  );
}
