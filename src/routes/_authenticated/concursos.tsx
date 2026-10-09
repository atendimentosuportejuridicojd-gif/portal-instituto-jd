import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { PageContent, PageHeader, EmptyState } from "@/components/page";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Gavel, ExternalLink, CalendarDays } from "lucide-react";
import { alunoListConcursos } from "@/lib/trilhas.functions";

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

/** Interpreta YYYY-MM-DD como data local (sem deslocar o dia por fuso). */
function dataLocal(iso: string) {
  const [a, m, d] = iso.split("-").map(Number);
  return new Date(a, m - 1, d);
}

function diasAteProva(iso: string) {
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  return Math.round((dataLocal(iso).getTime() - hoje.getTime()) / 86_400_000);
}

function ConcursosPage() {
  const listFn = useServerFn(alunoListConcursos);
  const q = useQuery({ queryKey: ["concursos"], queryFn: () => listFn() });
  const concursos = q.data ?? [];

  return (
    <>
      <PageHeader
        title="Concursos"
        description="Informações para consulta. As matérias de cada concurso entram no seu cronograma de estudos."
        actions={
          <Button asChild>
            <Link to="/cronogramas">
              <CalendarDays className="mr-1 h-4 w-4" />
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
          <div className="grid gap-4 md:grid-cols-2">
            {concursos.map((c: any) => {
              const dias = c.data_prova ? diasAteProva(c.data_prova) : null;
              return (
                <section key={c.id} className="surface-card flex flex-col p-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h2 className="text-base font-semibold tracking-tight">{c.nome}</h2>
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

                  <div className="mt-4 flex items-center gap-2 text-sm">
                    <CalendarDays className="h-4 w-4 text-muted-foreground" />
                    {c.data_prova ? (
                      <>
                        <span>Prova em {dataLocal(c.data_prova).toLocaleDateString("pt-BR")}</span>
                        {dias !== null && dias >= 0 && (
                          <Badge variant="secondary">
                            {dias === 0 ? "é hoje" : dias === 1 ? "falta 1 dia" : `faltam ${dias} dias`}
                          </Badge>
                        )}
                      </>
                    ) : (
                      <span className="text-muted-foreground">Data da prova ainda não definida</span>
                    )}
                  </div>

                  {c.observacoes && (
                    <p className="mt-3 text-sm text-muted-foreground">{c.observacoes}</p>
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
