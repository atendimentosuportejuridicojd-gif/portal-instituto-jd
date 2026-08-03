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
