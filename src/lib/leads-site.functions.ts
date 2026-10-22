import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { PERGUNTAS_SITE, montarLinhaSite } from "@/lib/leads-site";

const resposta = (id: (typeof PERGUNTAS_SITE)[number]["id"]) =>
  z.enum(PERGUNTAS_SITE.find((p) => p.id === id)!.opcoes as [string, ...string[]]);

const schema = z.object({
  nome: z.string().trim().min(3, "Informe seu nome completo").max(120),
  email: z.string().trim().email("E-mail inválido").max(255),
  telefone: z.string().trim().min(10, "Telefone inválido").max(20).regex(/^[0-9()+\-\s]+$/, "Telefone inválido"),
  carreira: resposta("carreira"),
  como_estuda: resposta("como_estuda"),
  horas_dia: resposta("horas_dia"),
  prazo_prova: resposta("prazo_prova"),
  consentimento: z.literal(true, { message: "É preciso concordar para enviar" }),
  site: z.string().max(0).optional(), // campo-isca: robôs preenchem, pessoas não veem
  gclid: z.string().optional(),
});

/**
 * Grava o lead do formulário "Escolha sua carreira" em leads_diagnostico (origem "site_form"),
 * com a mesma pontuação do formulário da Meta. Um mesmo e-mail enviado de novo em 10 minutos
 * não duplica a linha. Sem logs de dado pessoal.
 */
export const registrarLeadSite = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => schema.parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const db = supabaseAdmin as any;
    const email = data.email.toLowerCase();
    const gclidInformado = data.gclid?.trim() ?? "";
    const gclid = gclidInformado.length <= 200 && /^[A-Za-z0-9_-]+$/.test(gclidInformado) ? gclidInformado : null;

    const desde = new Date(Date.now() - 10 * 60_000).toISOString();
    const { data: recente } = await db
      .from("leads_diagnostico")
      .select("id")
      .eq("origem", "site_form")
      .eq("email", email)
      .gte("criado_em", desde)
      .limit(1);
    if (recente?.length) return { ok: true as const };

    const linha = montarLinhaSite({ ...data, email, gclid });
    const { error } = await db.from("leads_diagnostico").insert(linha);
    if (error) {
      console.error("[leads-site] falha ao gravar", error.code ?? "sem código");
      throw new Error("Não foi possível enviar agora. Tente novamente em instantes.");
    }
    return { ok: true as const };
  });
