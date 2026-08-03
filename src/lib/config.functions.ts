import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const configSchema = z.object({
  nome_plataforma: z.string().trim().min(1).max(200).optional(),
  nome_curto: z.string().trim().min(1).max(80).optional(),
  logo_url: z.string().trim().max(500).nullable().optional(),
  favicon_url: z.string().trim().max(500).nullable().optional(),
  email_contato: z.string().trim().email().max(200).nullable().optional(),
  telefone: z.string().trim().max(50).nullable().optional(),
  whatsapp: z.string().trim().max(50).nullable().optional(),
  instagram_url: z.string().trim().max(300).nullable().optional(),
  facebook_url: z.string().trim().max(300).nullable().optional(),
  youtube_url: z.string().trim().max(300).nullable().optional(),
  linkedin_url: z.string().trim().max(300).nullable().optional(),
  hotmart_regularizacao_url: z.string().trim().max(500).nullable().optional(),
  texto_rodape: z.string().trim().max(2000).nullable().optional(),
  sobre: z.string().trim().max(5000).nullable().optional(),
});

// Authenticated read — configuration includes internal contact data
export const getPlataformaConfig = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data } = await context.supabase
      .from("configuracoes_plataforma")
      .select("*")
      .eq("id", true)
      .maybeSingle();
    return data;
  });


export const updatePlataformaConfig = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => configSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "administrador",
    });
    if (!isAdmin) throw new Error("Acesso restrito ao administrador.");
    const { error } = await context.supabase
      .from("configuracoes_plataforma")
      .update({ ...data, updated_at: new Date().toISOString(), updated_by: context.userId })
      .eq("id", true);
    if (error) throw new Error(error.message);
    await context.supabase.from("admin_logs").insert({
      user_id: context.userId,
      acao: "config.update",
      entidade: "configuracoes_plataforma",
      metadata: data as any,
    });
    return { ok: true };
  });
