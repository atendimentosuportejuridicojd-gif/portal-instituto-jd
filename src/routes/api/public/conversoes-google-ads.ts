import { createFileRoute } from "@tanstack/react-router";
import { timingSafeEqual } from "node:crypto";

/**
 * Fila de conversões offline do Google Ads, lida pelo comando `conversoes` do agentes-jd.
 *
 * Segurança: exige `Authorization: Bearer <CONVERSOES_TOKEN>` (secret do projeto, mesmo valor
 * em CONVERSOES_TOKEN no .env do agentes-jd). Sem o secret configurado, o endpoint responde 503.
 * Só expõe a tabela `conversoes_google_ads`; não dá acesso a mais nada do banco.
 *
 * GET  -> lista as conversões com status "pendente" (mais antigas primeiro, até 200).
 * POST -> { id, status: "enviada" | "erro" | "pendente", erro? } atualiza uma linha.
 */
const COLUNAS =
  "id, gclid, hotmart_transaction_id, valor, moeda, convertido_em, gclid_capturado_em, status";

function autorizado(request: Request): boolean | null {
  const esperado = process.env.CONVERSOES_TOKEN;
  if (!esperado) return null;
  const recebido = (request.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "");
  const a = Buffer.from(recebido);
  const b = Buffer.from(esperado);
  return a.length === b.length && timingSafeEqual(a, b);
}

function json(corpo: unknown, status = 200) {
  return new Response(JSON.stringify(corpo), { status, headers: { "Content-Type": "application/json" } });
}

export const Route = createFileRoute("/api/public/conversoes-google-ads")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const ok = autorizado(request);
        if (ok === null) return json({ erro: "CONVERSOES_TOKEN não configurado" }, 503);
        if (!ok) return json({ erro: "Não autorizado" }, 401);

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data, error } = await (supabaseAdmin as any)
          .from("conversoes_google_ads")
          .select(COLUNAS)
          .eq("status", "pendente")
          .order("convertido_em", { ascending: true })
          .limit(200);
        if (error) return json({ erro: error.message }, 500);
        return json(data ?? []);
      },

      POST: async ({ request }) => {
        const ok = autorizado(request);
        if (ok === null) return json({ erro: "CONVERSOES_TOKEN não configurado" }, 503);
        if (!ok) return json({ erro: "Não autorizado" }, 401);

        let corpo: any;
        try {
          corpo = await request.json();
        } catch {
          return json({ erro: "JSON inválido" }, 400);
        }
        const { id, status, erro } = corpo ?? {};
        if (typeof id !== "string" || !/^[0-9a-f-]{36}$/i.test(id)) return json({ erro: "id inválido" }, 400);
        if (!["enviada", "erro", "pendente"].includes(status)) return json({ erro: "status inválido" }, 400);

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { error } = await (supabaseAdmin as any)
          .from("conversoes_google_ads")
          .update({
            status,
            erro: typeof erro === "string" ? erro.slice(0, 300) : null,
            enviada_em: status === "enviada" ? new Date().toISOString() : null,
          })
          .eq("id", id);
        if (error) return json({ erro: error.message }, 500);
        return json({ ok: true });
      },
    },
  },
});
