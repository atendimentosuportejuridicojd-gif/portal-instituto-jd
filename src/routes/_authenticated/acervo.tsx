import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { PageContent, PageHeader, EmptyState } from "@/components/page";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { BookOpen, FileText, PencilLine, RefreshCw, BarChart3 } from "lucide-react";
import { cn } from "@/lib/utils";
import { alunoListMateriaisComProgresso } from "@/lib/questoes.functions";

export const Route = createFileRoute("/_authenticated/acervo")({
  head: () => ({ meta: [{ title: "Acervo Base — Portal J&D" }] }),
  component: Acervo,
});

function Acervo() {
  const fetchFn = useServerFn(alunoListMateriaisComProgresso);
  const q = useQuery({ queryKey: ["aluno", "acervo"], queryFn: () => fetchFn() });

  const materiais = q.data ?? [];
  const grupos = materiais.reduce((acc: Record<string, any[]>, m: any) => {
    (acc[m.disciplina] ??= []).push(m);
    return acc;
  }, {});

  return (
    <>
      <PageHeader
        title="Acervo Base"
        description="Biblioteca principal organizada por disciplinas."
      />
      <PageContent>
        {q.isLoading ? (
          <div className="text-sm text-muted-foreground">Carregando…</div>
        ) : materiais.length === 0 ? (
          <EmptyState
            icon={BookOpen}
            title="Acervo em preparação"
            description="Os materiais serão publicados em breve."
          />
        ) : (
          <div className="space-y-8">
            {Object.entries(grupos).map(([disciplina, items]) => (
              <section key={disciplina}>
                <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  {disciplina}
                </h2>
                <div className="space-y-2">
                  {items.map((m: any) => (
                    <MaterialRow key={m.id} m={m} />
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}
      </PageContent>
    </>
  );
}

function MaterialRow({ m }: { m: any }) {
  const jaFez = m.desempenho !== null;
  const temQuestoes = m.total_questoes > 0;
  const perf = m.desempenho as number | null;
  const perfColor =
    perf === null ? "" : perf >= 85 ? "text-green-600" : perf >= 70 ? "text-yellow-600" : "text-red-600";

  return (
    <div className="surface-card flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
          <h3 className="truncate text-sm font-semibold">{m.titulo}</h3>
        </div>
        {m.descricao && (
          <p className="mt-1 line-clamp-1 text-xs text-muted-foreground">{m.descricao}</p>
        )}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Button variant="ghost" size="sm" disabled title="Disponível na Etapa 2">
          <FileText className="mr-1 h-3.5 w-3.5" />
          Visualizar PDF
        </Button>
        {temQuestoes ? (
          <Button asChild variant="outline" size="sm">
            <Link to="/materiais/$materialId/questoes" params={{ materialId: m.id }}>
              {jaFez ? (
                <>
                  <RefreshCw className="mr-1 h-3.5 w-3.5" />
                  Refazer questões
                </>
              ) : (
                <>
                  <PencilLine className="mr-1 h-3.5 w-3.5" />
                  Resolver questões
                </>
              )}
            </Link>
          </Button>
        ) : (
          <Badge variant="secondary" className="text-xs">Sem questões</Badge>
        )}
        {jaFez && (
          <Button asChild variant="ghost" size="sm">
            <Link to="/materiais/$materialId/desempenho" params={{ materialId: m.id }}>
              <BarChart3 className="mr-1 h-3.5 w-3.5" />
              Desempenho: <span className={cn("ml-1 tabular-nums", perfColor)}>{perf}%</span>
            </Link>
          </Button>
        )}
      </div>
    </div>
  );
}
