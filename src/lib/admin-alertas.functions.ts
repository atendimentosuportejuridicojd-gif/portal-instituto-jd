import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/**
 * Alertas em tempo (quase) real para o administrador:
 * novos cadastros (teste ou comum) e novas assinaturas registradas
 * depois do instante informado.
 */
export const adminNovosCadastros = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ desde: z.string() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { data: isAdmin } = await supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "administrador",
    });
    if (!isAdmin) throw new Error("Acesso restrito.");

    const [{ data: perfis }, { data: assinaturas }] = await Promise.all([
      supabase
        .from("profiles")
        .select("id, nome_completo, email, origem, created_at")
        .gt("created_at", data.desde)
        .order("created_at", { ascending: false })
        .limit(10),
      supabase
        .from("assinaturas")
        .select("id, user_id, plano, produto, status, created_at")
        .gt("created_at", data.desde)
        .order("created_at", { ascending: false })
        .limit(10),
    ]);

    const idsAssin = (assinaturas ?? []).map((a) => a.user_id);
    const { data: perfisAssin } = idsAssin.length
      ? await supabase.from("profiles").select("id, nome_completo, email").in("id", idsAssin)
      : { data: [] as any[] };
    const mapa = new Map((perfisAssin ?? []).map((p: any) => [p.id, p]));

    return {
      agora: new Date().toISOString(),
      cadastros: (perfis ?? []).map((p) => ({
        id: `perfil:${p.id}`,
        tipo: p.origem === "teste_gratis" ? ("teste" as const) : ("cadastro" as const),
        nome: p.nome_completo || p.email,
        email: p.email,
        created_at: p.created_at,
      })),
      assinaturas: (assinaturas ?? []).map((a) => ({
        id: `assinatura:${a.id}`,
        tipo: "assinatura" as const,
        nome: mapa.get(a.user_id)?.nome_completo || mapa.get(a.user_id)?.email || "Novo aluno",
        email: mapa.get(a.user_id)?.email ?? "",
        plano: a.plano ?? a.produto ?? null,
        created_at: a.created_at,
      })),
    };
  });
