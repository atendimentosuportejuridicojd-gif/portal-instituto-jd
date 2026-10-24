/** Bancas usadas para filtrar questões no cronograma e nos simulados. */
export const BANCAS = ["CEBRASPE", "FGV", "FCC"] as const;
export type Banca = (typeof BANCAS)[number];

/** Converte o texto da banca (do concurso ou da questão) para o código padrão; null = sem banca reconhecida. */
export function normalizarBanca(texto: string | null | undefined): Banca | null {
  const t = (texto ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase();
  if (!t.trim()) return null;
  if (t.includes("CEBRASPE") || t.includes("CESPE")) return "CEBRASPE";
  if (t.includes("FGV") || t.includes("GETULIO VARGAS")) return "FGV";
  if (t.includes("FCC") || t.includes("CARLOS CHAGAS")) return "FCC";
  return null;
}
