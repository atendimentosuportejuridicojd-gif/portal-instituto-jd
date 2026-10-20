import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function assertAdmin(ctx: { supabase: any; userId: string }) {
  const { data } = await ctx.supabase.rpc("has_role", { _user_id: ctx.userId, _role: "administrador" });
  if (!data) throw new Error("Acesso restrito ao administrador.");
}

export const adminListLeadsDiagnostico = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        segmento: z.enum(["todos", "quente", "morno", "frio"]).default("todos"),
        origem: z.enum(["todas", "diagnostico", "meta_form"]).default("todas"),
      })
      .parse(d ?? {}),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabase } = context;

    let query = (supabase as any)
      .from("leads_diagnostico")
      .select(
        "id, nome, email, telefone, respostas, pontuacao, segmento, gclid, criado_em, origem, carreira, como_estuda, horas_dia, prazo_prova, avisos",
      )
      .order("criado_em", { ascending: false })
      .limit(200);
    if (data.origem !== "todas") query = query.eq("origem", data.origem);
    if (data.segmento !== "todos") query = query.eq("segmento", data.segmento);

    const { data: leads, error } = await query;
    if (error) throw new Error(error.message);
    return leads ?? [];
  });
