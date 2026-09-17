import { Clock } from "lucide-react";
import { useEffect, useState } from "react";

function restante(expiraEm: string) {
  const ms = new Date(expiraEm).getTime() - Date.now();
  if (ms <= 0) return null;
  const total = Math.floor(ms / 1000);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const p = (n: number) => String(n).padStart(2, "0");
  return `${p(h)}:${p(m)}:${p(s)}`;
}

/** Fita fixa no topo do portal com os dias restantes e o cronômetro do teste gratuito. */
export function TrialRibbon({ dias, expiraEm }: { dias: number; expiraEm?: string | null }) {
  const [tempo, setTempo] = useState<string | null>(() => (expiraEm ? restante(expiraEm) : null));

  useEffect(() => {
    if (!expiraEm) return;
    setTempo(restante(expiraEm));
    const id = setInterval(() => setTempo(restante(expiraEm)), 1000);
    return () => clearInterval(id);
  }, [expiraEm]);

  const texto =
    dias <= 0
      ? "Seu teste gratuito termina hoje."
      : dias === 1
        ? "Você tem mais 1 dia de acesso ao teste gratuito."
        : `Você tem mais ${dias} dias de acesso ao teste gratuito.`;

  return (
    <div className="relative flex items-center justify-between gap-x-3 bg-gold px-4 py-2 text-xs font-medium text-gold-foreground">
      {/* Cronômetro — canto esquerdo superior */}
      {tempo && (
        <span className="flex min-w-[96px] items-center gap-1.5 rounded-lg bg-gold-foreground/10 px-2.5 py-1 font-semibold tabular-nums tracking-wider">
          <Clock className="h-3.5 w-3.5 shrink-0" />
          {tempo}
        </span>
      )}

      {/* Mensagem — centralizada */}
      <span className="absolute left-1/2 -translate-x-1/2 text-center">{texto}</span>

      {/* Botão de assinatura — canto direito */}
      <a
        href="https://carreira360.institutojd.ia.br"
        target="_blank"
        rel="noopener noreferrer"
        className="rounded-full bg-gold-foreground px-3.5 py-1 font-semibold text-gold shadow-sm transition hover:opacity-90"
      >
        Quero assinar
      </a>
    </div>
  );
}
