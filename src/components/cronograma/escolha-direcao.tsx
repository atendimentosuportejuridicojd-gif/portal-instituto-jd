import { ChevronRight, Compass, Target } from "lucide-react";
import { Button } from "@/components/ui/button";

export type Direcao = "continuada" | "pos_edital";

/** Primeira tela do cronograma: Preparação continuada (antes do edital) ou Método J&D no Pós-edital. */
export function EscolhaDirecao({ onEscolher, onCancelar }: { onEscolher: (d: Direcao) => void; onCancelar?: () => void }) {
  const opcoes: { id: Direcao; icone: typeof Compass; titulo: string; texto: string; itens: string[] }[] = [
    {
      id: "continuada",
      icone: Compass,
      titulo: "Preparação continuada",
      texto: "O edital ainda não saiu? Comece agora pelo cargo que você quer.",
      itens: ["Você escolhe a trilha (cargo)", "Estuda as matérias do Acervo Base", "Sem data de prova e sem simulados"],
    },
    {
      id: "pos_edital",
      icone: Target,
      titulo: "Método J&D aplicado no Pós-edital",
      texto: "Edital publicado? Monte o plano até a data da sua prova.",
      itens: ["Você escolhe o concurso", "Plano até a véspera da prova", "Simulados opcionais a cada 15 dias"],
    },
  ];
  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <div className="text-center">
        <h2 className="text-lg font-semibold">Como você quer estudar?</h2>
        <p className="text-sm text-muted-foreground">Escolha a direção do seu cronograma.</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        {opcoes.map((o) => (
          <button
            key={o.id}
            type="button"
            onClick={() => onEscolher(o.id)}
            className="surface-card group flex flex-col gap-3 p-5 text-left transition hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md"
          >
            <span className="grid h-11 w-11 place-items-center rounded-xl bg-gradient-to-br from-primary/15 to-gold/25 text-primary">
              <o.icone className="h-5 w-5" />
            </span>
            <span>
              <span className="block text-base font-semibold">{o.titulo}</span>
              <span className="mt-1 block text-sm text-muted-foreground">{o.texto}</span>
            </span>
            <ul className="space-y-1 text-xs text-muted-foreground">
              {o.itens.map((i) => (
                <li key={i}>• {i}</li>
              ))}
            </ul>
            <span className="mt-auto inline-flex items-center gap-1 text-sm font-medium text-primary">
              Escolher <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </span>
          </button>
        ))}
      </div>
      {onCancelar && (
        <div className="text-center">
          <Button variant="ghost" onClick={onCancelar}>
            Cancelar
          </Button>
        </div>
      )}
    </div>
  );
}
