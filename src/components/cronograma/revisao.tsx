import { Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { BarChart3, CheckCircle2, ListChecks, Loader2, RotateCcw } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { alunoRevisaoBloco } from "@/lib/cronograma-aluno.functions";
import { formatarMinutos } from "./formato";

/** Botão do bloco de revisão: abre a lista das matérias abaixo da meta, calculada no momento. */
export function RevisaoBloco({ blocoId }: { blocoId: string }) {
  const [aberto, setAberto] = useState(false);
  const fn = useServerFn(alunoRevisaoBloco);
  const q = useQuery({
    queryKey: ["aluno", "revisao", blocoId],
    queryFn: () => fn({ data: { bloco_id: blocoId } }),
    enabled: aberto,
    // A lista muda conforme o aluno resolve questões; sempre recalcula ao abrir.
    staleTime: 0,
  });
  const d = q.data;

  return (
    <>
      <Button size="sm" variant="outline" onClick={() => setAberto(true)}>
        <RotateCcw className="mr-1 h-3.5 w-3.5" />
        Ver revisão
      </Button>
      <Dialog open={aberto} onOpenChange={setAberto}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Revisão — {d?.disciplina ?? "…"}</DialogTitle>
            <DialogDescription>
              Revise pelas questões comentadas as matérias abaixo de {d?.meta ?? 85}% de acertos, desta disciplina e
              das anteriores. Quando passar da meta, a matéria sai da lista.
            </DialogDescription>
          </DialogHeader>

          {q.isLoading && (
            <p className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Calculando a sua revisão…
            </p>
          )}
          {q.error && <p className="text-sm text-destructive">{(q.error as Error).message}</p>}

          {d && (
            <div className="space-y-4">
              {d.itens.length === 0 ? (
                <div className="flex items-start gap-3 rounded-lg border border-primary/20 bg-primary/5 p-4 text-sm">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
                  <p>
                    Tudo acima de {d.meta}%. Nada para revisar agora; marque a revisão como concluída e siga para a
                    próxima disciplina.
                  </p>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  {d.resumo.paraRevisar} matéria(s) para revisar · tempo estimado{" "}
                  <strong>{formatarMinutos(d.resumo.minutosEstimados)}</strong>
                  {" "}(reservado no plano: {formatarMinutos(d.resumo.minutosReservados)}).
                  {d.resumo.minutosEstimados > d.resumo.minutosReservados &&
                    " Se não couber, faça o que der e use “Recalcular a partir de hoje”."}
                </p>
              )}

              <ul className="space-y-2">
                {d.itens.map((i: any) => (
                  <li
                    key={i.material_id}
                    className="flex flex-wrap items-center gap-3 rounded-lg border border-border/60 px-3 py-2.5"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{i.titulo}</p>
                      <p className="text-xs text-muted-foreground">
                        {i.disciplina} · {i.qtdQuestoes} questão(ões)
                        {i.total ? ` · última vez: ${i.acertos}/${i.total}` : ""}
                      </p>
                    </div>
                    {i.estado === "sem_resolucao" ? (
                      <Badge variant="outline">Ainda não resolvida</Badge>
                    ) : (
                      <Badge variant="destructive">{Math.round(i.percentual)}%</Badge>
                    )}
                    <div className="flex gap-2">
                      <Button asChild size="sm">
                        <Link to="/materiais/$materialId/questoes" params={{ materialId: i.material_id }}>
                          <ListChecks className="mr-1 h-3.5 w-3.5" />
                          Resolver
                        </Link>
                      </Button>
                      {i.estado === "abaixo" && (
                        <Button asChild size="sm" variant="ghost">
                          <Link to="/materiais/$materialId/desempenho" params={{ materialId: i.material_id }}>
                            <BarChart3 className="mr-1 h-3.5 w-3.5" />
                            Erros
                          </Link>
                        </Button>
                      )}
                    </div>
                  </li>
                ))}
              </ul>

              {d.resumo.semQuestoes > 0 && (
                <p className="text-xs text-muted-foreground">
                  {d.resumo.semQuestoes} matéria(s) ainda sem questões cadastradas não entram na revisão.
                </p>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
