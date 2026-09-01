import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/**
 * Registra este dispositivo/navegador como a sessão ativa do aluno.
 * Qualquer sessão anterior deixa de ser válida (o outro navegador será deslogado).
 */
export const registrarSessao = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        device_id: z.string().trim().min(8).max(80),
        user_agent: z.string().trim().max(400).optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { error } = await supabase.from("sessoes_ativas").upsert(
      {
        user_id: userId,
        device_id: data.device_id,
        user_agent: data.user_agent ?? null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" },
    );
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/** Verifica se este dispositivo continua sendo a sessão ativa do aluno. */
export const verificarSessao = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ device_id: z.string().trim().min(8).max(80) }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    const { data: isAdmin } = await supabase.rpc("has_role", {
      _user_id: userId,
      _role: "administrador",
    });
    if (isAdmin) return { valida: true };

    const { data: atual } = await supabase
      .from("sessoes_ativas")
      .select("device_id")
      .eq("user_id", userId)
      .maybeSingle();

    // Sem registro (primeiro acesso após a atualização): assume este dispositivo.
    if (!atual) {
      await supabase.from("sessoes_ativas").upsert(
        { user_id: userId, device_id: data.device_id, updated_at: new Date().toISOString() },
        { onConflict: "user_id" },
      );
      return { valida: true };
    }

    return { valida: atual.device_id === data.device_id };
  });
