import { Link } from "@tanstack/react-router";
import { Play, PencilLine, RefreshCw } from "lucide-react";
import type { ComponentProps, ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { useSessoesEmAndamento } from "@/hooks/use-sessoes-andamento";

/**
 * Botão que leva às questões de uma matéria. Se o aluno começou e não terminou, vira "Retomar as questões"
 * (com quantas já respondeu); senão mostra o rótulo normal.
 */
export function BotaoQuestoes({
  materialId,
  rotulo = "Resolver questões",
  icone,
  jaFez,
  variant = "outline",
  size = "sm",
  className,
  mostrarProgresso = true,
}: {
  materialId: string;
  /** Texto quando não há questões em andamento. */
  rotulo?: ReactNode;
  icone?: ReactNode;
  /** Já concluiu uma tentativa antes: o padrão passa a ser "Refazer questões". */
  jaFez?: boolean;
  variant?: ComponentProps<typeof Button>["variant"];
  size?: ComponentProps<typeof Button>["size"];
  className?: string;
  mostrarProgresso?: boolean;
}) {
  const { emAndamento } = useSessoesEmAndamento();
  const sessao = emAndamento(materialId);

  return (
    <Button asChild variant={variant} size={size} className={className}>
      <Link to="/materiais/$materialId/questoes" params={{ materialId }}>
        {sessao ? (
          <>
            <Play className="mr-1.5 h-3.5 w-3.5" />
            Retomar as questões
            {mostrarProgresso && (
              <span className="ml-1.5 rounded-full bg-black/10 px-1.5 py-0.5 text-[10px] font-semibold tabular-nums dark:bg-white/15">
                {sessao.respondidas}/{sessao.total}
              </span>
            )}
          </>
        ) : jaFez ? (
          <>
            <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
            Refazer questões
          </>
        ) : (
          <>
            {icone ?? <PencilLine className="mr-1.5 h-3.5 w-3.5" />}
            {rotulo}
          </>
        )}
      </Link>
    </Button>
  );
}
