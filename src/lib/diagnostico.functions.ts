import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const gclidSchema = z.preprocess((value) => {
  if (typeof value !== "string") return undefined;
  const normalized = value.trim();
  return normalized.length > 0 && normalized.length <= 200 && /^[A-Za-z0-9_-]+$/.test(normalized)
    ? normalized
    : undefined;
}, z.string().optional());

const schema = z.object({
  pista: z.enum(["trt8", "erro_concurseiro"]),
  cargo: z.enum(["tecnico", "analista", "oficial_justica", "indeciso"]).optional(),
  area: z.enum(["tribunais", "mps", "indeciso", "outra"]).optional(),
  habito_estudo: z.enum(["so_edital", "de_vez_em_quando", "todos_dias", "nao_comecei"]).optional(),
  tempo_estudo: z.enum(["nunca", "menos_6m", "6_12m", "mais_1ano"]).optional(),
  tempo_semanal: z.enum(["menos_5h", "5_10h", "10_20h", "mais_20h"]).optional(),
  dificuldade: z.enum(["nao_sei_comecar", "falta_tempo", "nao_sei_o_que_cai", "sem_evolucao"]),
  questao1: z.enum(["a", "b", "c", "d"]),
  questao2: z.enum(["a", "b", "c", "d"]),
  meta_vida: z.enum(["sim", "nao_certeza"]),
  nome: z.string().trim().min(3).max(120),
  telefone: z
    .string()
    .trim()
    .min(10)
    .max(20)
    .regex(/^[0-9()+\-\s]+$/, "Telefone inválido"),
  gclid: gclidSchema,
});

const GABARITO = { questao1: "d", questao2: "b" } as const;

/**
 * Cadastro público do Diagnóstico de Preparação (duas pistas: "trt8" — específico de um
 * concurso — e "erro_concurseiro" — amplo, sem concurso definido). Não cria conta nem usuário:
 * é só um lead, com pontuação calculada aqui (nunca confiar em pontuação vinda do cliente).
 */
export const criarLeadDiagnostico = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => schema.parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    let pontos = 0;
    if (data.pista === "trt8") {
      if (data.cargo && data.cargo !== "indeciso") pontos += 2;
      if (data.tempo_estudo === "6_12m" || data.tempo_estudo === "mais_1ano") pontos += 2;
    } else {
      if (data.area === "tribunais" || data.area === "mps") pontos += 2;
      if (data.habito_estudo === "todos_dias") pontos += 1;
      if (data.tempo_semanal && data.tempo_semanal !== "menos_5h") pontos += 1;
    }
    if (data.questao1 === GABARITO.questao1) pontos += 1;
    if (data.questao2 === GABARITO.questao2) pontos += 1;
    if (data.meta_vida === "sim") pontos += 1;

    const segmento = pontos >= 5 ? "quente" : pontos >= 3 ? "morno" : "frio";
    const confirmouErro = data.pista === "erro_concurseiro" && (data.habito_estudo === "so_edital" || data.habito_estudo === "de_vez_em_quando");

    const telefoneDigitos = data.telefone.replace(/\D/g, "");
    const gclidInformado = data.gclid?.trim() ?? "";
    const gclid = gclidInformado.length <= 200 && /^[A-Za-z0-9_-]+$/.test(gclidInformado) ? gclidInformado : undefined;

    await supabaseAdmin.from("leads_diagnostico").insert({
      pista: data.pista,
      concurso: data.pista === "trt8" ? "trt8" : null,
      nome: data.nome,
      telefone: telefoneDigitos,
      respostas: {
        cargo: data.cargo ?? null,
        area: data.area ?? null,
        habito_estudo: data.habito_estudo ?? null,
        tempo_estudo: data.tempo_estudo ?? null,
        tempo_semanal: data.tempo_semanal ?? null,
        dificuldade: data.dificuldade,
        questao1: data.questao1,
        questao2: data.questao2,
        meta_vida: data.meta_vida,
      },
      pontuacao: pontos,
      segmento,
      gclid: gclid ?? null,
    });

    return { pontuacao: pontos, segmento, metaVidaSim: data.meta_vida === "sim", confirmouErro };
  });
