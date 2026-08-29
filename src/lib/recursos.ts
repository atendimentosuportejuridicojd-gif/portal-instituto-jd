export const TIPOS_RECURSO = {
  multiplas_respostas: "Múltiplas respostas",
  alteracao_gabarito: "Alteração de gabarito",
  anular_questao: "Anular questão",
} as const;

export type TipoRecurso = keyof typeof TIPOS_RECURSO;
