import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { PageContent, PageHeader, EmptyState } from "@/components/page";
import { Button } from "@/components/ui/button";
import { Gavel, ExternalLink, CalendarDays, Landmark, Target, ArrowRight } from "lucide-react";
import { alunoListConcursos } from "@/lib/trilhas.functions";
import { diferencaDias } from "@/lib/cronograma-motor";
import { formatarData } from "@/components/cronograma/formato";
import { hojeBrasilia } from "@/lib/simulado-pagamento";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/concursos")({
  head: () => ({
    meta: [
      { title: "Concursos — Portal do Aluno J&D" },
      {
        name: "description",
        content: "Consulte os concursos acompanhados pelo Instituto J&D: órgão, banca, edital e data da prova.",
      },
      { property: "og:title", content: "Concursos — Portal do Aluno J&D" },
      { property: "og:description", content: "Informações dos concursos para planejar a sua preparação." },
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
  const hoje = hojeBrasilia();

  return (
    <>
      <PageHeader
        icone={Landmark}
        rotulo="Preparação específica"
        title="Concursos"
        description="Informações para consulta. As matérias de cada concurso entram no seu cronograma de estudos."
        actions={
          <Button asChild>
            <Link to="/cronogramas">
              <CalendarDays className="mr-1.5 h-4 w-4" />
              Meu cronograma
            </Link>
          </Button>
        }
      />
      <PageContent>
        {q.isLoading ? (
          <div className="text-sm text-muted-foreground">Carregando…</div>
        ) : concursos.length === 0 ? (
          <EmptyState
            icon={Gavel}
            title="Nenhum concurso publicado"
            description="Assim que novos editais forem mapeados, você verá as informações aqui."
          />
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {concursos.map((c: any) => {
              const dias = c.data_prova ? diferencaDias(hoje, c.data_prova) : null;
              const urgente = dias !== null && dias >= 0 && dias <= 30;
              return (
                <section
                  key={c.id}
                  className="surface-card group flex flex-col overflow-hidden hover:-translate-y-0.5 hover:shadow-md"
                >
                  <div className="flex items-start gap-3 p-5">
                    <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                      <Landmark className="h-5 w-5" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <h2 className="text-base font-semibold leading-snug tracking-tight">{c.nome}</h2>
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {[c.orgao, c.banca, c.estado, c.ano].filter(Boolean).map((t: any) => (
                          <span key={String(t)} className="rounded-full bg-muted px-2.5 py-0.5 text-[11px] font-medium text-muted-foreground">
                            {t}
                          </span>
                        ))}
                        {![c.orgao, c.banca, c.estado, c.ano].some(Boolean) && (
                          <span className="text-xs text-muted-foreground">Detalhes em breve</span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="mx-5 flex items-center gap-3 rounded-xl bg-muted/50 px-4 py-3">
                    <Target className="h-4 w-4 shrink-0 text-muted-foreground" />
                    {c.data_prova ? (
                      <div className="flex min-w-0 flex-1 flex-wrap items-center justify-between gap-2">
                        <div>
                          <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Data da prova</p>
                          <p className="text-sm font-semibold tabular-nums">{formatarData(c.data_prova)}</p>
                        </div>
                        {dias !== null && dias >= 0 && (
                          <span
                            className={cn(
                              "rounded-full px-3 py-1 text-xs font-semibold",
                              urgente ? "bg-rose-500/10 text-rose-700 dark:text-rose-300" : "bg-gold/20 text-gold-foreground dark:text-gold",
                            )}
                          >
                            {dias === 0 ? "é hoje" : dias === 1 ? "falta 1 dia" : `faltam ${dias} dias`}
                          </span>
                        )}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">Data da prova ainda não definida</p>
                    )}
                  </div>

                  {c.observacoes && <p className="px-5 pt-3 text-sm text-muted-foreground">{c.observacoes}</p>}

                  <div className="mt-auto flex flex-wrap items-center gap-2 p-5 pt-4">
                    <Button asChild size="sm">
                      <Link to="/cronogramas">
                        Montar cronograma
                        <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
                      </Link>
                    </Button>
                    {c.edital_url && (
                      <Button asChild size="sm" variant="outline">
                        <a href={c.edital_url} target="_blank" rel="noopener noreferrer">
                          <ExternalLink className="mr-1.5 h-3.5 w-3.5" />
                          Edital
                        </a>
                      </Button>
                    )}
                  </div>
                </section>
              );
            })}
          </div>
        )}
      </PageContent>
    </>
  );
}
