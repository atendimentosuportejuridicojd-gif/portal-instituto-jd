import { useRef, useState } from "react";
import type { HTMLAttributes, ReactNode } from "react";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { deslocamento, indiceAlvo, moverItem, type Retangulo } from "@/lib/ordenar";

// ---------- cores por tipo de atividade ----------

export const ESTILO_TIPO: Record<string, { rotulo: string; borda: string; selo: string; ponto: string }> = {
  estudo: {
    rotulo: "Estudo",
    borda: "border-l-sky-500",
    selo: "bg-sky-500/10 text-sky-700 dark:text-sky-300",
    ponto: "bg-sky-500",
  },
  questoes: {
    rotulo: "Questões",
    borda: "border-l-violet-500",
    selo: "bg-violet-500/10 text-violet-700 dark:text-violet-300",
    ponto: "bg-violet-500",
  },
  revisao: {
    rotulo: "Revisão",
    borda: "border-l-amber-500",
    selo: "bg-amber-500/10 text-amber-700 dark:text-amber-300",
    ponto: "bg-amber-500",
  },
  fase_final: {
    rotulo: "Fase final",
    borda: "border-l-emerald-500",
    selo: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
    ponto: "bg-emerald-500",
  },
  simulado: {
    rotulo: "Simulado",
    borda: "border-l-rose-500",
    selo: "bg-rose-500/10 text-rose-700 dark:text-rose-300",
    ponto: "bg-rose-500",
  },
};

export function SeloTipo({ tipo, className }: { tipo: string; className?: string }) {
  const e = ESTILO_TIPO[tipo];
  if (!e) return null;
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-medium", e.selo, className)}>
      <span className={cn("h-1.5 w-1.5 rounded-full", e.ponto)} />
      {e.rotulo}
    </span>
  );
}

// ---------- cores por disciplina (pela posição na ordem de estudo) ----------

const CORES_DISCIPLINA = [
  { barra: "bg-sky-500", numero: "bg-sky-500/15 text-sky-700 dark:text-sky-300" },
  { barra: "bg-violet-500", numero: "bg-violet-500/15 text-violet-700 dark:text-violet-300" },
  { barra: "bg-emerald-500", numero: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300" },
  { barra: "bg-amber-500", numero: "bg-amber-500/15 text-amber-700 dark:text-amber-300" },
  { barra: "bg-rose-500", numero: "bg-rose-500/15 text-rose-700 dark:text-rose-300" },
  { barra: "bg-cyan-500", numero: "bg-cyan-500/15 text-cyan-700 dark:text-cyan-300" },
  { barra: "bg-indigo-500", numero: "bg-indigo-500/15 text-indigo-700 dark:text-indigo-300" },
  { barra: "bg-lime-500", numero: "bg-lime-500/15 text-lime-700 dark:text-lime-300" },
  { barra: "bg-fuchsia-500", numero: "bg-fuchsia-500/15 text-fuchsia-700 dark:text-fuchsia-300" },
  { barra: "bg-orange-500", numero: "bg-orange-500/15 text-orange-700 dark:text-orange-300" },
];

export function corDisciplina(indice: number) {
  return CORES_DISCIPLINA[((indice % CORES_DISCIPLINA.length) + CORES_DISCIPLINA.length) % CORES_DISCIPLINA.length];
}

// ---------- indicador de passos ----------

export function Passos({
  nomes,
  atual,
  onIr,
}: {
  nomes: string[];
  atual: number;
  onIr?: (indice: number) => void;
}) {
  return (
    <ol className="flex items-center" aria-label="Passos do assistente">
      {nomes.map((nome, i) => {
        const feito = i < atual;
        const corrente = i === atual;
        return (
          <li key={nome} className={cn("flex items-center", i < nomes.length - 1 && "flex-1")}>
            <button
              type="button"
              disabled={!feito || !onIr}
              onClick={() => onIr?.(i)}
              aria-current={corrente ? "step" : undefined}
              className={cn(
                "group flex items-center gap-2 rounded-full py-1 pr-1 text-left transition-colors",
                feito && onIr && "cursor-pointer",
              )}
            >
              <span
                className={cn(
                  "grid h-8 w-8 shrink-0 place-items-center rounded-full text-xs font-semibold transition-all",
                  feito && "bg-gold text-gold-foreground",
                  corrente && "bg-primary text-primary-foreground ring-4 ring-primary/15",
                  !feito && !corrente && "bg-muted text-muted-foreground",
                )}
              >
                {feito ? <Check className="h-4 w-4" /> : i + 1}
              </span>
              <span
                className={cn(
                  "hidden text-xs font-medium sm:inline",
                  corrente ? "text-foreground" : "text-muted-foreground",
                )}
              >
                {nome}
              </span>
            </button>
            {i < nomes.length - 1 && (
              <span
                aria-hidden
                className={cn("mx-2 h-0.5 flex-1 rounded-full transition-colors sm:mx-3", feito ? "bg-gold" : "bg-border")}
              />
            )}
          </li>
        );
      })}
    </ol>
  );
}

// ---------- cartão de número ----------

export function Kpi({
  icone: Icone,
  rotulo,
  valor,
  detalhe,
  destaque,
}: {
  icone: React.ComponentType<{ className?: string }>;
  rotulo: string;
  valor: ReactNode;
  detalhe?: ReactNode;
  destaque?: boolean;
}) {
  return (
    <div className={cn("surface-card flex items-start gap-3 p-4", destaque && "border-gold/60 bg-gold/5")}>
      <span
        className={cn(
          "grid h-10 w-10 shrink-0 place-items-center rounded-lg",
          destaque ? "bg-gold/20 text-gold-foreground dark:text-gold" : "bg-primary/10 text-primary",
        )}
      >
        <Icone className="h-5 w-5" />
      </span>
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground">{rotulo}</p>
        <p className="mt-0.5 text-xl font-semibold tabular-nums leading-tight">{valor}</p>
        {detalhe && <p className="mt-0.5 text-xs text-muted-foreground">{detalhe}</p>}
      </div>
    </div>
  );
}

// ---------- anel de progresso ----------

export function AnelProgresso({ valor, tamanho = 96, children }: { valor: number; tamanho?: number; children?: ReactNode }) {
  const raio = tamanho / 2 - 7;
  const circunferencia = 2 * Math.PI * raio;
  const pct = Math.max(0, Math.min(100, valor));
  return (
    <div className="relative shrink-0" style={{ width: tamanho, height: tamanho }}>
      <svg width={tamanho} height={tamanho} className="-rotate-90" aria-hidden>
        <circle cx={tamanho / 2} cy={tamanho / 2} r={raio} fill="none" strokeWidth={7} className="stroke-current opacity-20" />
        <circle
          cx={tamanho / 2}
          cy={tamanho / 2}
          r={raio}
          fill="none"
          strokeWidth={7}
          strokeLinecap="round"
          strokeDasharray={circunferencia}
          strokeDashoffset={circunferencia * (1 - pct / 100)}
          className="stroke-gold transition-[stroke-dashoffset] duration-700"
        />
      </svg>
      <div className="absolute inset-0 grid place-items-center text-center">{children}</div>
    </div>
  );
}

// ---------- lista que se reordena arrastando ----------

interface Arrasto {
  id: string;
  de: number;
  alvo: number;
  dy: number;
  retangulos: Retangulo[];
  passo: number;
}

type PropsAlca = Pick<
  HTMLAttributes<HTMLButtonElement>,
  "onPointerDown" | "onPointerMove" | "onPointerUp" | "onPointerCancel" | "onKeyDown" | "style" | "aria-label" | "title"
>;

/**
 * Lista reordenável por arrasto (mouse e toque) e pelo teclado (setas para cima/baixo com a alça em foco).
 * Quem usa a lista desenha cada item e liga `alca` a um botão: só a alça inicia o arrasto, então o resto do item
 * continua clicável e a rolagem da página no celular não é afetada.
 */
export function ListaArrastavel<T>({
  itens,
  idDe,
  aoReordenar,
  renderItem,
  className,
}: {
  itens: T[];
  idDe: (item: T) => string;
  aoReordenar: (novos: T[]) => void;
  renderItem: (item: T, indice: number, ctl: { alca: PropsAlca; arrastando: boolean }) => ReactNode;
  className?: string;
}) {
  const elementos = useRef(new Map<string, HTMLLIElement>());
  const inicioY = useRef(0);
  const [arrasto, setArrasto] = useState<Arrasto | null>(null);

  const alcaDe = (item: T, indice: number): PropsAlca => {
    const id = idDe(item);
    return {
      "aria-label": "Arrastar para reordenar (ou use as setas para cima e para baixo)",
      title: "Arraste para reordenar",
      style: { touchAction: "none", cursor: arrasto?.id === id ? "grabbing" : "grab" },
      onPointerDown: (e) => {
        if (e.pointerType === "mouse" && e.button !== 0) return;
        const retangulos: Retangulo[] = itens.map((it) => {
          const el = elementos.current.get(idDe(it));
          const r = el?.getBoundingClientRect();
          return { top: r?.top ?? 0, height: r?.height ?? 0 };
        });
        const espaco = retangulos.length > 1 ? retangulos[1].top - (retangulos[0].top + retangulos[0].height) : 8;
        inicioY.current = e.clientY;
        try {
          e.currentTarget.setPointerCapture(e.pointerId);
        } catch {
          /* captura indisponível: o arrasto continua pelos eventos do próprio botão */
        }
        setArrasto({ id, de: indice, alvo: indice, dy: 0, retangulos, passo: retangulos[indice].height + Math.max(0, espaco) });
      },
      onPointerMove: (e) => {
        if (!arrasto || arrasto.id !== id) return;
        const dy = e.clientY - inicioY.current;
        const r = arrasto.retangulos[arrasto.de];
        setArrasto({ ...arrasto, dy, alvo: indiceAlvo(arrasto.retangulos, arrasto.de, r.top + r.height / 2 + dy) });
      },
      onPointerUp: (e) => {
        if (!arrasto || arrasto.id !== id) return;
        try {
          e.currentTarget.releasePointerCapture(e.pointerId);
        } catch {
          /* já liberada */
        }
        const { de, alvo } = arrasto;
        setArrasto(null);
        if (de !== alvo) aoReordenar(moverItem(itens, de, alvo));
      },
      onPointerCancel: () => setArrasto(null),
      onKeyDown: (e) => {
        if (e.key !== "ArrowUp" && e.key !== "ArrowDown") return;
        e.preventDefault();
        const para = indice + (e.key === "ArrowUp" ? -1 : 1);
        if (para >= 0 && para < itens.length) aoReordenar(moverItem(itens, indice, para));
      },
    };
  };

  return (
    <ol className={className}>
      {itens.map((item, i) => {
        const id = idDe(item);
        const arrastando = arrasto?.id === id;
        const dy = arrastando
          ? arrasto!.dy
          : arrasto
            ? deslocamento(i, arrasto.de, arrasto.alvo, arrasto.passo)
            : 0;
        return (
          <li
            key={id}
            ref={(el) => {
              if (el) elementos.current.set(id, el);
              else elementos.current.delete(id);
            }}
            style={{ transform: dy ? `translateY(${dy}px)` : undefined }}
            className={cn(
              "relative select-none",
              arrastando ? "z-20 scale-[1.01] shadow-lg" : "transition-transform duration-200 ease-out",
            )}
          >
            {renderItem(item, i, { alca: alcaDe(item, i), arrastando })}
          </li>
        );
      })}
    </ol>
  );
}
