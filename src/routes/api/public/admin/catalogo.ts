import { createFileRoute } from "@tanstack/react-router";

/**
 * GET /api/public/admin/catalogo
 *
 * Retorna apenas a árvore de conteúdo (disciplinas, módulos e materiais) para
 * automações administrativas. Nenhum dado de aluno, assinatura ou e-mail.
 *
 * Autorização: header `Authorization: Bearer <ADMIN_API_TOKEN>`.
 */
export const Route = createFileRoute("/api/public/admin/catalogo")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const { verificarTokenAdmin, jsonResponse } = await import("@/lib/admin-api.server");
        const negado = verificarTokenAdmin(request);
        if (negado) return negado;

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        const [disciplinas, modulos, materiais] = await Promise.all([
          supabaseAdmin
            .from("disciplinas")
            .select("id, nome, slug, grupo, especifica, concurso_id, ordem")
            .order("ordem"),
          supabaseAdmin.from("modulos").select("id, nome, disciplina_id, ordem").order("ordem"),
          supabaseAdmin
            .from("materiais")
            .select("id, titulo, disciplina_id, modulo_id, publicado, versao, ordem")
            .order("ordem"),
        ]);

        const erro = disciplinas.error ?? modulos.error ?? materiais.error;
        if (erro) {
          return jsonResponse({ error: erro.message }, 500);
        }

        return jsonResponse({
          disciplinas: disciplinas.data ?? [],
          modulos: modulos.data ?? [],
          materiais: materiais.data ?? [],
        });
      },
    },
  },
});
