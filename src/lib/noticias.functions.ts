import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/** Notícias publicadas ("Fique por Dentro") — visíveis a qualquer aluno logado. */
export const alunoListNoticias = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("noticias")
      .select("id, titulo, resumo, conteudo, imagem_url, fixado, published_at")
      .eq("publicado", true)
      .order("fixado", { ascending: false })
      .order("published_at", { ascending: false })
      .limit(60);
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const alunoGetNoticia = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: noticia, error } = await context.supabase
      .from("noticias")
      .select("id, titulo, resumo, conteudo, imagem_url, published_at")
      .eq("id", data.id)
      .eq("publicado", true)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return noticia;
  });

/* ---------------- Admin: publicação do "Fique por Dentro" ---------------- */

async function assertAdmin(context: any) {
  const { data: isAdmin } = await context.supabase.rpc("has_role", {
    _user_id: context.userId,
    _role: "administrador",
  });
  if (!isAdmin) throw new Error("Acesso restrito ao administrador.");
}

export const adminListNoticias = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { data, error } = await context.supabase
      .from("noticias")
      .select("id, titulo, resumo, conteudo, imagem_url, fixado, publicado, published_at")
      .order("published_at", { ascending: false })
      .limit(200);
    if (error) throw new Error(error.message);
    return data ?? [];
  });

const noticiaSchema = z.object({
  titulo: z.string().trim().min(1).max(200),
  resumo: z.string().trim().max(500).optional().nullable(),
  conteudo: z.string().trim().max(20000).optional().nullable(),
  imagem_url: z.string().trim().max(1000).optional().nullable(),
  fixado: z.boolean().default(false),
  publicado: z.boolean().default(true),
});

export const adminCriarNoticia = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => noticiaSchema.parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { error } = await context.supabase.from("noticias").insert({
      titulo: data.titulo,
      resumo: data.resumo || null,
      conteudo: data.conteudo || null,
      imagem_url: data.imagem_url || null,
      fixado: data.fixado,
      publicado: data.publicado,
      published_at: new Date().toISOString(),
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const adminAtualizarNoticia = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({ id: z.string().uuid(), fixado: z.boolean().optional(), publicado: z.boolean().optional() })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const patch: Record<string, unknown> = {};
    if (data.fixado !== undefined) patch.fixado = data.fixado;
    if (data.publicado !== undefined) patch.publicado = data.publicado;
    const { error } = await context.supabase.from("noticias").update(patch).eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const adminExcluirNoticia = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { error } = await context.supabase.from("noticias").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
