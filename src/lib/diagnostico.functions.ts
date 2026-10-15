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
  pista_slug: z.string().trim().min(1).max(60),
  respostas_perfil: z.record(z.string(), z.string()).default({}),
  questao1: z.string().min(1).max(10),
  questao2: z.string().min(1).max(10),
  fechamento: z.string().min(1).max(60),
  nome: z.string().trim().min(3).max(120),
  telefone: z
    .string()
    .trim()
    .min(10)
    .max(20)
    .regex(/^[0-9()+\-\s]+$/, "Telefone inválido"),
  gclid: gclidSchema,
});

/**
 * Cadastro público do Diagnóstico de Preparação. Não cria conta nem usuário: é só um lead.
 * A pontuação é sempre recalculada aqui a partir da configuração real da pista (nunca confiar
 * em pontuação ou gabarito vindo do cliente).
 */
export const criarLeadDiagnostico = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => schema.parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: pista, error: errPista } = await supabaseAdmin
      .from("pistas_diagnostico")
      .select("slug, concurso, perguntas_perfil, questao1, questao2, pergunta_fechamento, mensagens")
      .eq("slug", data.pista_slug)
      .eq("ativo", true)
      .maybeSingle();
    if (errPista) throw new Error(errPista.message);
    if (!pista) throw new Error("Diagnóstico não encontrado ou não está mais disponível.");

    let pontos = 0;
    let pontosMax = 0;

    for (const pergunta of pista.perguntas_perfil as any[]) {
      const max = Math.max(...pergunta.opcoes.map((o: any) => o.pontos));
      pontosMax += max;
      const escolhida = pergunta.opcoes.find((o: any) => o.valor === data.respostas_perfil[pergunta.campo]);
      pontos += escolhida?.pontos ?? 0;
    }

    const fechamentoOpcoes = (pista.pergunta_fechamento as any).opcoes as any[];
    pontosMax += Math.max(...fechamentoOpcoes.map((o) => o.pontos));
    const fechamentoEscolhido = fechamentoOpcoes.find((o) => o.valor === data.fechamento);
    pontos += fechamentoEscolhido?.pontos ?? 0;

    pontosMax += 2;
    if (data.questao1 === (pista.questao1 as any).gabarito) pontos += 1;
    if (data.questao2 === (pista.questao2 as any).gabarito) pontos += 1;

    const percentual = pontosMax > 0 ? pontos / pontosMax : 0;
    const segmento = percentual >= 0.7 ? "quente" : percentual >= 0.4 ? "morno" : "frio";

    const telefoneDigitos = data.telefone.replace(/\D/g, "");
    const gclidInformado = data.gclid?.trim() ?? "";
    const gclid = gclidInformado.length <= 200 && /^[A-Za-z0-9_-]+$/.test(gclidInformado) ? gclidInformado : undefined;

    await supabaseAdmin.from("leads_diagnostico").insert({
      pista: pista.slug,
      concurso: pista.concurso,
      nome: data.nome,
      telefone: telefoneDigitos,
      respostas: { ...data.respostas_perfil, questao1: data.questao1, questao2: data.questao2, fechamento: data.fechamento },
      pontuacao: pontos,
      segmento,
      gclid: gclid ?? null,
    });

    const mensagem = (pista.mensagens as any)[segmento];
    return { pontuacao: pontos, pontosMax, segmento, mensagem };
  });
