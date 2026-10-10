import { useEffect, useState } from "react";
import {
  BookOpenCheck,
  CalendarCheck,
  ChevronDown,
  ClipboardCheck,
  Layers,
  ListChecks,
  RotateCcw,
  Sparkles,
  Timer,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { META_DESEMPENHO } from "@/lib/cronograma-motor";

const chave = (cronogramaId: string) => `jd_metodo_visto_${cronogramaId}`;

const PRINCIPIOS = [
  {
    icone: Layers,
    titulo: "Uma disciplina por vez",
    texto:
      "Você estuda uma disciplina até concluí-la, matéria por matéria, e só então passa para a seguinte. Sem alternar disciplinas ao longo da semana: o cérebro organiza melhor o assunto quando você fecha um ciclo.",
  },
  {
    icone: ListChecks,
    titulo: "Questões desde o início",
    texto:
      "Cada matéria tem leitura e questões comentadas. Estudo sem treino é leitura recreativa: resolver questões é o que fixa o conteúdo e mostra onde você realmente está.",
  },
  {
    icone: RotateCcw,
    titulo: `Revisão pelas questões (meta de ${META_DESEMPENHO}%)`,
    texto: `Ao terminar cada disciplina, você revisa pelas questões comentadas as matérias em que ficou abaixo de ${META_DESEMPENHO}% de acertos. Na revisão seguinte, voltam também as pendentes das disciplinas anteriores. Terminada a revisão, você segue adiante, mesmo sem ter chegado à meta.`,
  },
  {
    icone: ClipboardCheck,
    titulo: "Simulados a cada 15 dias (opcional)",
    texto:
      "Se você incluir os simulados, faz um a cada 15 dias, no formato da prova do seu concurso e sem comentários, só para medir o seu nível. Os resultados mostram em quais disciplinas voltar.",
  },
  {
    icone: CalendarCheck,
    titulo: "Até a véspera da prova",
    texto:
      "O plano vai da sua data de início até o dia anterior à prova. Se sobrar tempo, as últimas duas semanas viram a fase final, para trabalhar o desempenho completo. Ela é opcional e só entra se o tempo permitir.",
  },
  {
    icone: Timer,
    titulo: "Constância, sem horário rígido",
    texto:
      "É melhor cumprir 2 horas todos os dias do que tentar 8 e desistir na primeira semana. Use um cronômetro de foco, faça pausas entre as sessões (o Instituto sugere 20 minutos) e, se atrasar, use “Recalcular a partir de hoje”.",
  },
];

/**
 * Aviso do Método J&D no cronograma. Abre sozinho na primeira vez que o aluno vê aquele cronograma;
 * depois fica recolhido e pode ser reaberto. A lembrança de "já vi" é guardada no navegador, por cronograma.
 */
export function AvisoMetodo({ cronogramaId }: { cronogramaId: string }) {
  const [aberto, setAberto] = useState(false);

  useEffect(() => {
    try {
      if (!window.localStorage.getItem(chave(cronogramaId))) setAberto(true);
    } catch {
      // Sem acesso ao armazenamento do navegador (modo privado etc.): mostra o aviso fechado, o aluno abre se quiser.
    }
  }, [cronogramaId]);

  const entendi = () => {
    setAberto(false);
    try {
      window.localStorage.setItem(chave(cronogramaId), "1");
    } catch {
      /* sem armazenamento: o aviso abre de novo na próxima visita */
    }
  };

  return (
    <section
      aria-label="Como funciona o Método J&D"
      className={cn(
        "surface-card overflow-hidden border-l-4 border-l-gold transition-colors",
        aberto && "bg-gold/[0.04]",
      )}
    >
      <button
        type="button"
        onClick={() => (aberto ? entendi() : setAberto(true))}
        aria-expanded={aberto}
        className="flex w-full items-center gap-3 px-4 py-3.5 text-left sm:px-5"
      >
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-gold/20 text-gold-foreground dark:text-gold">
          <Sparkles className="h-4.5 w-4.5" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-semibold">Como funciona o seu cronograma: Método J&D</span>
          {!aberto && (
            <span className="block text-xs text-muted-foreground">
              Uma disciplina por vez, revisão pelas questões e a data da prova como referência. Toque para ver.
            </span>
          )}
        </span>
        <ChevronDown className={cn("h-4 w-4 shrink-0 text-muted-foreground transition-transform", aberto && "rotate-180")} />
      </button>

      {aberto && (
        <div className="animate-in fade-in slide-in-from-top-1 space-y-5 border-t border-border/60 px-4 pb-5 pt-4 duration-300 sm:px-5">
          <p className="text-sm text-muted-foreground">
            Este cronograma foi montado pelo Método J&D, criado a partir da preparação de quem foi aprovado em concursos
            da carreira judiciária. O estudo acontece em ciclos de <strong className="text-foreground">base, prática,
            revisão e ajuste</strong>. Veja como ele funciona:
          </p>

          <ul className="grid gap-3 md:grid-cols-2">
            {PRINCIPIOS.map(({ icone: Icone, titulo, texto }) => (
              <li key={titulo} className="flex gap-3 rounded-xl border border-border/60 bg-card p-3.5">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
                  <Icone className="h-4 w-4" />
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-semibold leading-snug">{titulo}</p>
                  <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{texto}</p>
                </div>
              </li>
            ))}
          </ul>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="flex items-center gap-2 text-xs text-muted-foreground">
              <BookOpenCheck className="h-3.5 w-3.5" />
              Você pode reabrir este resumo quando quiser, pelo cartão no topo do cronograma.
            </p>
            <Button size="sm" onClick={entendi}>
              Entendi, vamos estudar
            </Button>
          </div>
        </div>
      )}
    </section>
  );
}
