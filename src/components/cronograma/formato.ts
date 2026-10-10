import { somarDias } from "@/lib/cronograma-motor";

export function formatarMinutos(m: number): string {
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  const r = m % 60;
  return r ? `${h}h${String(r).padStart(2, "0")}` : `${h}h`;
}

const DIAS = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"];

/** "sex, 09/10" a partir de YYYY-MM-DD, sem deslocar o dia por fuso. */
export function formatarDia(iso: string): string {
  const [a, m, d] = iso.split("-").map(Number);
  const dow = new Date(Date.UTC(a, m - 1, d)).getUTCDay();
  return `${DIAS[dow]}, ${String(d).padStart(2, "0")}/${String(m).padStart(2, "0")}`;
}

export function formatarData(iso: string): string {
  const [a, m, d] = iso.split("-");
  return `${d}/${m}/${a}`;
}

export function proximosDias(inicio: string, quantidade: number): string[] {
  return Array.from({ length: quantidade }, (_, i) => somarDias(inicio, i));
}

export const ROTULO_TIPO: Record<string, string> = {
  estudo: "Estudo",
  questoes: "Questões",
  revisao: "Revisão",
  fase_final: "Fase final",
  simulado: "Simulado",
};
