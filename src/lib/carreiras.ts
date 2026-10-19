export const CARREIRAS = [
  { id: "judiciaria", nome: "Carreira Judiciária", marca: "Carreira Judiciária 360", descricao: "Tribunais e Ministérios Públicos: TJ, TRT, TRF, TRE e MP." },
  { id: "fiscal", nome: "Carreira Fiscal", marca: "Carreira Fiscal 360", descricao: "Receita Federal, SEFAZ, auditoria e fiscalização tributária." },
  { id: "policial", nome: "Carreira Policial", marca: "Carreira Policial 360", descricao: "PF, PRF, Polícias Civis, Penais e Militares." },
] as const;
export type CarreiraId = (typeof CARREIRAS)[number]["id"];
export const CARREIRA_IDS = CARREIRAS.map((c) => c.id) as CarreiraId[];
export function nomeCarreira(id?: string | null) {
  return CARREIRAS.find((c) => c.id === id)?.marca ?? "Sua Carreira 360";
}
