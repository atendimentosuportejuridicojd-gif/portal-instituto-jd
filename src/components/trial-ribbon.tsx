import { Link } from "@tanstack/react-router";
import { Clock } from "lucide-react";

/** Fita fixa no topo do portal com os dias restantes do teste gratuito. */
export function TrialRibbon({ dias }: { dias: number }) {
  const texto =
    dias <= 0
      ? "Seu teste gratuito termina hoje."
      : dias === 1
        ? "Você tem mais 1 dia de acesso ao teste gratuito."
        : `Você tem mais ${dias} dias de acesso ao teste gratuito.`;

  return (
    <div className="flex items-center justify-center gap-2 bg-gold px-4 py-2 text-center text-xs font-medium text-gold-foreground">
      <Clock className="h-3.5 w-3.5 shrink-0" />
      <span>{texto}</span>
      <Link to="/perfil" className="underline underline-offset-2">
        Quero assinar
      </Link>
    </div>
  );
}
