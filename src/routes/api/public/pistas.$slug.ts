import { createFileRoute } from "@tanstack/react-router";

/**
 * Dados públicos do gancho de uma pista do Diagnóstico, para a página de gancho no site
 * institucional (outro domínio) montar sua própria tela sem duplicar conteúdo manualmente.
 * Só expõe título, subtítulo e texto do botão — nunca as perguntas, opções ou gabarito.
 */
const ORIGEM_PERMITIDA = "https://www.institutojd.ia.br";

function json(corpo: unknown, status = 200) {
  return new Response(JSON.stringify(corpo), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": ORIGEM_PERMITIDA,
      "Cache-Control": "public, max-age=60",
    },
  });
}

export const Route = createFileRoute("/api/public/pistas/$slug")({
  server: {
    handlers: {
      GET: async ({ params }) => {
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data, error } = await supabaseAdmin
          .from("pistas_diagnostico")
          .select("slug, nome, gancho_titulo, gancho_subtexto, cta_texto")
          .eq("slug", params.slug)
          .eq("ativo", true)
          .maybeSingle();
        if (error) return json({ erro: error.message }, 500);
        if (!data) return json({ erro: "Diagnóstico não encontrado." }, 404);
        return json(data);
      },
    },
  },
});
