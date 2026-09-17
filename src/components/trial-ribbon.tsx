import { Link } from "@tanstack/react-router";
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
    <div className="flex flex-wrap items-center justify-center gap-x-2 gap-y-1 bg-gold px-4 py-2 text-center text-xs font-medium text-gold-foreground">
      <Clock className="h-3.5 w-3.5 shrink-0" />
      <span>{texto}</span>
      {tempo && (
        <span className="rounded bg-gold-foreground/10 px-2 py-0.5 font-semibold tabular-nums tracking-wider">
          {tempo}
        </span>
      )}
      <Link to="/perfil" className="underline underline-offset-2">
        Quero assinar
      </Link>
    </div>
  );
}
