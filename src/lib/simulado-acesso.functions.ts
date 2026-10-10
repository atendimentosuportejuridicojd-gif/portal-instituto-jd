import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/** Diz se o aluno logado tem o serviço avulso de simulados liberado (manual ou pago) e até quando. */
export const alunoAcessoSimulado = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { acessoSimuladoLiberado } = await import("@/lib/cronograma-aluno.server");
    // Administrador: acesso livre, sem prazo. Demais alunos: o registro em simulado_acessos.
    if (await acessoSimuladoLiberado(context.supabase, context.userId)) {
      const { data } = await (context.supabase as any)
        .from("simulado_acessos")
        .select("fim")
        .eq("user_id", context.userId)
        .maybeSingle();
      return { liberado: true, fim: (data?.fim as string | null) ?? null };
    }
    return { liberado: false, fim: null as string | null };
  });
