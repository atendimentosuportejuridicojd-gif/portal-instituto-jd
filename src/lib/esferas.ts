export const ESFERAS = [
  { id: "federal", nome: "Federal" },
  { id: "estadual", nome: "Estadual" },
  { id: "municipal", nome: "Municipal" },
] as const;
export type EsferaId = (typeof ESFERAS)[number]["id"];
export const ESFERA_IDS = ESFERAS.map((e) => e.id) as [EsferaId, ...EsferaId[]];
export function nomeEsfera(id?: string | null) {
  return ESFERAS.find((e) => e.id === id)?.nome ?? id ?? "";
}
