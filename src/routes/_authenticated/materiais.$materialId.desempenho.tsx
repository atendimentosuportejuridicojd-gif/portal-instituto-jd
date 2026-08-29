import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { PageContent, PageHeader, EmptyState } from "@/components/page";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { BarChart3, Check, X, RefreshCw, ArrowLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { getDesempenhoMaterial } from "@/lib/questoes.functions";
import { useMaterialNavegacao } from "@/hooks/use-material-navegacao";

export const Route = createFileRoute("/_authenticated/materiais/$materialId/desempenho")({
  head: () => ({ meta: [{ title: "Desempenho — Portal J&D" }] }),
  component: Desempenho,
});

function Desempenho() {
  const { materialId } = Route.useParams();
  const fetchFn = useServerFn(getDesempenhoMaterial);
  const q = useQuery({
    queryKey: ["desempenho", materialId],
    queryFn: () => fetchFn({ data: { material_id: materialId } }),
  });
  const nav = useMaterialNavegacao(materialId);

  if (q.isLoading) {
    return <PageContent><div className="text-sm text-muted-foreground">Carregando…</div></PageContent>;
  }
  if (!q.data) return null;

  const { material, ultima, historico, detalhes } = q.data;

  return (
    <>
      <PageHeader
        title={material.titulo ?? "Desempenho"}
        description={material.disciplina}
        actions={
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="ghost">
              {nav.disciplinaId ? (
                <Link
                  to="/acervo/$cargoId/$disciplinaId"
                  params={{ cargoId: "todos", disciplinaId: nav.disciplinaId }}
                >
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Voltar para a disciplina
                </Link>
              ) : (
                <Link to="/acervo">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Voltar
                </Link>
              )}
            </Button>
            <Button asChild variant="outline">
              <Link to="/materiais/$materialId/questoes" params={{ materialId }}>
                <RefreshCw className="mr-2 h-4 w-4" />
                Refazer questões
              </Link>
            </Button>
            {nav.proxima && (
              <Button asChild>
                <Link to="/materiais/$materialId/pdf" params={{ materialId: nav.proxima.id }}>
                  Próxima matéria
                  <ChevronRight className="ml-1 h-4 w-4" />
                </Link>
              </Button>
            )}
          </div>
        }
      />
      <PageContent>
        {!ultima ? (
          <EmptyState
            icon={BarChart3}
            title="Sem tentativas concluídas"
            description="Resolva as questões deste material para ver o desempenho."
          />
        ) : (
          <div className="space-y-8">
            <div className="grid gap-4 md:grid-cols-4">
              <ResumoCard label="Aproveitamento" value={`${ultima.percentual}%`} highlight />
              <ResumoCard label="Total de questões" value={String(ultima.total)} />
              <ResumoCard label="Acertos" value={String(ultima.acertos)} />
              <ResumoCard label="Erros" value={String(ultima.erros)} />
            </div>

            <div className="surface-card border-primary/20 bg-primary/5 p-5 text-sm">
              <strong>Recomendação:</strong> Para um melhor aproveitamento nos estudos para concursos,
              recomenda-se buscar um desempenho igual ou superior a 85% em cada conteúdo.
            </div>

            <section>
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                Questões erradas
              </h2>
              <div className="space-y-3">
                {detalhes.filter((d: any) => !d.acertou).length === 0 ? (
                  <div className="surface-card p-6 text-sm text-muted-foreground">
                    Você não errou nenhuma questão nesta tentativa. Excelente!
                  </div>
                ) : (
                  detalhes
                    .filter((d: any) => !d.acertou)
                    .map((d: any, i: number) => (
                      <ErradaCard key={d.questao_id} idx={i + 1} d={d} />
                    ))
                )}
              </div>
            </section>

            <section>
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                Questões acertadas
              </h2>
              <div className="flex flex-wrap gap-2">
                {detalhes.filter((d: any) => d.acertou).length === 0 ? (
                  <div className="surface-card w-full p-6 text-sm text-muted-foreground">
                    Nenhuma acertada nesta tentativa.
                  </div>
                ) : (
                  detalhes
                    .filter((d: any) => d.acertou)
                    .map((d: any, i: number) => (
                      <Badge key={d.questao_id} variant="secondary" className="gap-1">
                        <Check className="h-3 w-3 text-green-600" />
                        Questão {i + 1}
                      </Badge>
                    ))
                )}
              </div>
            </section>

            {historico.length > 1 && (
              <section>
                <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                  Histórico de tentativas
                </h2>
                <div className="surface-card overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="border-b border-border/60 bg-muted/30 text-xs uppercase tracking-wider text-muted-foreground">
                      <tr>
                        <th className="px-4 py-2 text-left font-medium">Tentativa</th>
                        <th className="px-4 py-2 text-left font-medium">Data</th>
                        <th className="px-4 py-2 text-right font-medium">Aproveitamento</th>
                      </tr>
                    </thead>
                    <tbody>
                      {historico.map((h: any) => (
                        <tr key={h.tentativa} className="border-b border-border/40 last:border-0">
                          <td className="px-4 py-2">{h.tentativa}ª</td>
                          <td className="px-4 py-2 text-muted-foreground">
                            {h.data ? new Date(h.data).toLocaleDateString("pt-BR") : "—"}
                          </td>
                          <td className="px-4 py-2 text-right font-medium tabular-nums">{h.percentual}%</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            )}
          </div>
        )}
      </PageContent>
    </>
  );
}

function ResumoCard({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className={cn("surface-card p-5", highlight && "border-primary/30 bg-primary/5")}>
      <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className={cn("mt-2 text-2xl font-semibold tabular-nums", highlight && "text-primary")}>{value}</div>
    </div>
  );
}

function ErradaCard({ idx, d }: { idx: number; d: any }) {
  return (
    <div className="surface-card p-5">
      <div className="flex items-center gap-2">
        <X className="h-4 w-4 text-red-600" />
        <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          Questão {idx} · {d.referencia || "Sem referência"}
        </span>
      </div>
      <p className="mt-3 whitespace-pre-wrap text-sm">{d.enunciado}</p>
      <div className="mt-4 grid gap-2 md:grid-cols-2">
        <div className="rounded-md border border-red-500/40 bg-red-500/5 p-3 text-sm">
          <div className="text-xs font-medium uppercase tracking-wider text-red-700 dark:text-red-400">
            Sua resposta
          </div>
          <div className="mt-1">
            <span className="font-semibold">{d.escolhida?.letra ?? "—"})</span>{" "}
            {d.escolhida?.texto ?? "Não respondida"}
          </div>
        </div>
        <div className="rounded-md border border-green-500/40 bg-green-500/5 p-3 text-sm">
          <div className="text-xs font-medium uppercase tracking-wider text-green-700 dark:text-green-400">
            Resposta correta
          </div>
          <div className="mt-1">
            <span className="font-semibold">{d.correta?.letra ?? "—"})</span> {d.correta?.texto ?? "—"}
          </div>
        </div>
      </div>
      {d.comentario && (
        <div className="mt-4 rounded-md border border-border/60 bg-muted/30 p-3">
          <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Comentário do professor
          </div>
          <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed">{d.comentario}</p>
        </div>
      )}
    </div>
  );
}
