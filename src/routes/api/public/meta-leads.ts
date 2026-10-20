import { createFileRoute } from "@tanstack/react-router";
import { createHmac, timingSafeEqual } from "node:crypto";
import { prepararLeadMeta, type IdsNotificacao, type LeadGraph } from "@/lib/leads-meta";

/**
 * Webhook de Lead Ads da Meta (formulário instantâneo "Formulário Carreira 360").
 *
 * GET  -> verificação da inscrição: hub.mode=subscribe e hub.verify_token = META_VERIFY_TOKEN
 *         devolvem hub.challenge; qualquer outro caso é 403.
 * POST -> valida X-Hub-Signature-256 (HMAC-SHA256 do corpo bruto com META_APP_SECRET). Inválida = 401
 *         e nada é gravado. Para cada mudança "leadgen", busca o lead na Graph API e grava em
 *         leads_diagnostico com upsert por meta_lead_id (reentregas da Meta não duplicam).
 *
 * Variáveis de ambiente: META_VERIFY_TOKEN, META_APP_SECRET, META_PAGE_ACCESS_TOKEN, META_GRAPH_VERSION.
 * Sem logs de dado pessoal: só ids técnicos e códigos de status.
 */
// v1: nada de campos de anúncio na Graph API. form_id/ad_id/adgroup_id vêm da notificação do webhook.
const CAMPOS_GRAPH = "field_data,created_time,custom_disclaimer_responses";

function texto(corpo: string, status: number) {
  return new Response(corpo, { status, headers: { "Content-Type": "text/plain" } });
}

function igual(a: string, b: string): boolean {
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  // timingSafeEqual lança se os tamanhos diferem: confere antes.
  if (ba.length !== bb.length) return false;
  return timingSafeEqual(ba, bb);
}

function assinaturaValida(corpoBruto: string, cabecalho: string | null, segredo: string): boolean {
  if (!cabecalho?.startsWith("sha256=")) return false;
  const esperado = createHmac("sha256", segredo).update(corpoBruto, "utf8").digest("hex");
  return igual(cabecalho.slice("sha256=".length), esperado);
}

async function buscarLead(leadgenId: string, versao: string, token: string) {
  const url = `https://graph.facebook.com/${encodeURIComponent(versao)}/${encodeURIComponent(leadgenId)}?fields=${CAMPOS_GRAPH}`;
  const resp = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
    signal: AbortSignal.timeout(8000),
  });
  if (!resp.ok) throw new Error(`Graph API respondeu ${resp.status}`);
  return (await resp.json()) as LeadGraph;
}

export const Route = createFileRoute("/api/public/meta-leads")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const verifyToken = process.env.META_VERIFY_TOKEN;
        if (!verifyToken) return texto("META_VERIFY_TOKEN não configurado", 503);

        const p = new URL(request.url).searchParams;
        const recebido = p.get("hub.verify_token");
        const challenge = p.get("hub.challenge");
        if (p.get("hub.mode") === "subscribe" && recebido && challenge && igual(recebido, verifyToken)) {
          return texto(challenge, 200);
        }
        return texto("Forbidden", 403);
      },

      POST: async ({ request }) => {
        const segredo = process.env.META_APP_SECRET;
        const token = process.env.META_PAGE_ACCESS_TOKEN;
        const versao = process.env.META_GRAPH_VERSION;
        if (!segredo || !token || !versao) return texto("Integração Meta não configurada", 503);

        // Corpo BRUTO: a assinatura vale para os bytes exatos enviados, não para o JSON reserializado.
        const corpoBruto = await request.text();
        if (!assinaturaValida(corpoBruto, request.headers.get("x-hub-signature-256"), segredo)) {
          return texto("Unauthorized", 401);
        }

        let corpo: any;
        try {
          corpo = JSON.parse(corpoBruto);
        } catch {
          return texto("JSON inválido", 400);
        }

        const leads: { id: string; ids: IdsNotificacao }[] = [];
        for (const entrada of corpo?.entry ?? []) {
          for (const mudanca of entrada?.changes ?? []) {
            const v = mudanca?.field === "leadgen" ? mudanca?.value : null;
            if (v?.leadgen_id) {
              leads.push({ id: String(v.leadgen_id), ids: { form_id: v.form_id, ad_id: v.ad_id, adgroup_id: v.adgroup_id } });
            }
          }
        }

        if (leads.length > 0) {
          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
          let falhas = 0;
          for (const { id, ids } of leads) {
            try {
              const lead = await buscarLead(id, versao, token);
              // Campo não mapeado não é falha: grava com avisos e segue (200). Só Graph/gravação geram 500.
              const linha = prepararLeadMeta({ ...lead, id: lead.id ?? id }, ids, { lead, notificacao: ids });
              const { error } = await (supabaseAdmin as any)
                .from("leads_diagnostico")
                .upsert(linha, { onConflict: "meta_lead_id" });
              if (error) throw new Error(`Gravação falhou (${error.code ?? "sem código"})`);
            } catch (e) {
              falhas += 1;
              console.error("[meta-leads] falha ao processar leadgen", id, e instanceof Error ? e.message : "erro");
            }
          }
          // 500 faz a Meta reentregar; o upsert por meta_lead_id torna a repetição segura.
          if (falhas > 0) return texto("Falha ao processar", 500);
        }

        return texto("OK", 200);
      },
    },
  },
});
