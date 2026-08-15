// Helpers server-only para a API de automação administrativa.
// Autorização por token dedicado (ADMIN_API_TOKEN), sem acesso a dados de alunos.
import { timingSafeEqual } from "crypto";

export function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });
}

/**
 * Valida o header `Authorization: Bearer <ADMIN_API_TOKEN>`.
 * Retorna `null` quando autorizado, ou a Response de erro.
 */
export function verificarTokenAdmin(request: Request): Response | null {
  const expected = process.env.ADMIN_API_TOKEN;
  if (!expected) {
    return jsonResponse({ error: "ADMIN_API_TOKEN não configurado no servidor." }, 503);
  }

  const header = request.headers.get("authorization") ?? "";
  if (!header.startsWith("Bearer ")) {
    return jsonResponse({ error: "Unauthorized" }, 401);
  }

  const provided = header.slice("Bearer ".length).trim();
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    return jsonResponse({ error: "Unauthorized" }, 401);
  }

  return null;
}

export async function registrarAuditoria(
  acao: string,
  entidade: string,
  entidadeId: string | null,
  metadata: Record<string, unknown>,
) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  await supabaseAdmin.from("admin_logs").insert({
    user_id: null,
    acao,
    entidade,
    entidade_id: entidadeId,
    metadata: { origem: "api-automacao", ...metadata },
  });
}
