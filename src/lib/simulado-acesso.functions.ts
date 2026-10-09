import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/** Diz se o aluno logado tem o serviço avulso de simulados liberado (manual ou pago) e até quando. */
export const alunoAcessoSimulado = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data } = await (context.supabase as any)
      .from("simulado_acessos")
      .select("ativo, fim")
      .eq("user_id", context.userId)
      .maybeSingle();
    const liberado = data?.ativo === true && (!data.fim || new Date(data.fim).getTime() > Date.now());
    return { liberado, fim: (data?.fim as string | null) ?? null };
  });
