import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2, Trash2 } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { alunoExcluirCronograma } from "@/lib/cronograma-aluno.functions";
import { cn } from "@/lib/utils";

/**
 * Exclui de vez o cronograma ativo (ou descarta o rascunho que aguarda o pagamento dos simulados).
 * Pede confirmação, porque apaga também as atividades marcadas e os simulados feitos naquele cronograma.
 */
export function ExcluirCronograma({
  status,
  nome,
  rotulo,
  className,
  onDone,
}: {
  status: "ativo" | "rascunho";
  nome: string;
  rotulo?: string;
  className?: string;
  onDone?: () => void;
}) {
  const qc = useQueryClient();
  const fn = useServerFn(alunoExcluirCronograma);
  const mut = useMutation({
    mutationFn: () => fn({ data: { status } }),
    onSuccess: () => {
      toast.success(status === "ativo" ? "Cronograma excluído." : "Rascunho descartado.");
      qc.invalidateQueries({ queryKey: ["aluno"] });
      onDone?.();
    },
    onError: (e: any) => toast.error(e.message),
  });

  const ehRascunho = status === "rascunho";
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="ghost" size="sm" className={cn("gap-1.5", className)}>
          <Trash2 className="h-3.5 w-3.5" />
          {rotulo ?? (ehRascunho ? "Descartar rascunho" : "Excluir cronograma")}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{ehRascunho ? "Descartar este rascunho?" : "Excluir este cronograma?"}</AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-2 text-sm text-muted-foreground">
              <p>
                {ehRascunho ? (
                  <>
                    O rascunho de <strong className="text-foreground">{nome}</strong> será descartado. Nenhum
                    pagamento é cancelado ou cobrado por isso.
                  </>
                ) : (
                  <>
                    O cronograma de <strong className="text-foreground">{nome}</strong> será apagado de vez: o plano
                    de estudos, as atividades que você marcou como feitas e os <strong className="text-foreground">
                    resultados dos simulados</strong> feitos nele.
                  </>
                )}
              </p>
              {!ehRascunho && (
                <p>
                  Seu histórico de questões e de leitura das matérias <strong className="text-foreground">não é
                  afetado</strong>. Depois, você pode montar um novo cronograma quando quiser. Esta ação não pode ser
                  desfeita.
                </p>
              )}
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            onClick={(e) => {
              e.preventDefault();
              mut.mutate();
            }}
            disabled={mut.isPending}
          >
            {mut.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {ehRascunho ? "Descartar" : "Excluir definitivamente"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
