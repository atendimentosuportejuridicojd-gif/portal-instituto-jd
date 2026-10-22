import { createFileRoute } from "@tanstack/react-router";
import { timingSafeEqual } from "node:crypto";
import { prepararLeadGoogle, type LeadGoogle } from "@/lib/leads-google";

/**
 * Webhook do formulário de lead do Google Ads (extensão de formulário).
 *
 * POST -> confere google_key do corpo com GOOGLE_LEADS_KEY (o Google não assina o corpo). Chave errada = 401
 *         e nada é gravado. Os demais, inclusive os de teste (marcados com aviso), são gravados em
 *         leads_diagnostico com upsert por google_lead_id (reentregas do Google não duplicam).
 *
 * Respostas: 200 {} = recebido; 4xx {message} = o Google não reenvia; 5xx = o Google reenvia.
 * Variável de ambiente: GOOGLE_LEADS_KEY. Sem logs de dado pessoal: só o id técnico do lead.
 */
function json(corpo: unknown, status: number) {
  return new Response(JSON.stringify(corpo), { status, headers: { "Content-Type": "application/json" } });
}

function igual(a: string, b: string): boolean {
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  // timingSafeEqual lança se os tamanhos diferem: confere antes.
  if (ba.length !== bb.length) return false;
  return timingSafeEqual(ba, bb);
}

export const Route = createFileRoute("/api/public/google-leads")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const chave = process.env.GOOGLE_LEADS_KEY;
        if (!chave) return json({ message: "Integração Google não configurada" }, 503);

        let lead: LeadGoogle;
        try {
          lead = JSON.parse(await request.text());
        } catch {
          return json({ message: "JSON inválido" }, 400);
        }

        if (typeof lead?.google_key !== "string" || !igual(lead.google_key, chave)) {
          return json({ message: "Unauthorized" }, 401);
        }
        if (!lead.lead_id) return json({ message: "lead_id ausente" }, 400);

        try {
          const linha = prepararLeadGoogle(lead);
          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
          const { error } = await (supabaseAdmin as any)
            .from("leads_diagnostico")
            .upsert(linha, { onConflict: "google_lead_id" });
          if (error) throw new Error(`Gravação falhou (${error.code ?? "sem código"})`);
        } catch (e) {
          console.error("[google-leads] falha ao processar lead", lead.lead_id, e instanceof Error ? e.message : "erro");
          return json({ message: "Falha ao processar" }, 500);
        }

        return json({}, 200);
      },
    },
  },
});
