// Plan catalog (amounts live in Stripe; values here are display copy only).
export const ASSINATURA_SERVICE = "assinatura_portal";

export type Periodo = "mensal" | "anual";
export type CarreiraPlano = "judiciaria" | "fiscal" | "policial";

const PRECOS: Record<CarreiraPlano, { mensal: number; anual: number }> = {
  judiciaria: { mensal: 76.9, anual: 784.38 },
  policial: { mensal: 76.9, anual: 784.38 },
  fiscal: { mensal: 129.9, anual: 1324.98 },
};

export function carreiraPlano(c?: string | null): CarreiraPlano {
  return c === "fiscal" || c === "policial" ? c : "judiciaria";
}
export function priceIdPlano(carreira: string | null | undefined, periodo: Periodo) {
  return `${carreiraPlano(carreira)}_${periodo}`;
}
export function precosPlano(carreira?: string | null) {
  const p = PRECOS[carreiraPlano(carreira)];
  return { ...p, anualCheio: Math.round(p.mensal * 12 * 100) / 100, anualMes: Math.round((p.anual / 12) * 100) / 100 };
}
export function parsePriceId(priceId: string): { carreira: CarreiraPlano; periodo: Periodo } | null {
  const m = /^(judiciaria|fiscal|policial)_(mensal|anual)$/.exec(priceId);
  return m ? { carreira: m[1] as CarreiraPlano, periodo: m[2] as Periodo } : null;
}

/** Stripe subscription status -> portal status. Non-payment blocks access (no fees). */
export function statusPortal(stripeStatus: string): "ativa" | "inadimplente" | "cancelada" {
  if (stripeStatus === "active" || stripeStatus === "trialing") return "ativa";
  if (stripeStatus === "canceled" || stripeStatus === "incomplete_expired") return "cancelada";
  return "inadimplente";
}

/** Annual plan: one year of access from the payment date. */
export function fimAnual(pagoEm: Date): string {
  const d = new Date(pagoEm);
  d.setUTCFullYear(d.getUTCFullYear() + 1);
  return d.toISOString();
}

export const brl = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
