import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { getStoredConsent, updateConsent } from "@/lib/google-ads";

/** Aviso de cookies (LGPD). Só decide o que mostrar depois de montado no cliente. */
export function CookieConsentBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    setVisible(getStoredConsent() === null);
  }, []);

  if (!visible) return null;

  const decide = (decision: "granted" | "denied") => {
    updateConsent(decision);
    setVisible(false);
  };

  return (
    <div
      role="region"
      aria-label="Aviso de cookies"
      className="fixed inset-x-0 bottom-0 z-50 border-t border-border bg-background/95 p-4 shadow-lg backdrop-blur supports-[backdrop-filter]:bg-background/80"
    >
      <div className="mx-auto flex max-w-4xl flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted-foreground">
          Usamos cookies para medir o desempenho de anúncios e melhorar sua experiência. Você pode
          aceitar ou recusar os cookies não essenciais.
        </p>
        <div className="flex shrink-0 gap-2">
          <Button variant="outline" size="sm" onClick={() => decide("denied")}>
            Recusar
          </Button>
          <Button size="sm" onClick={() => decide("granted")}>
            Aceitar
          </Button>
        </div>
      </div>
    </div>
  );
}
