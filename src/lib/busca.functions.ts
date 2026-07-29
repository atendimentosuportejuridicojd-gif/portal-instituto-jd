import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type BuscaResultado = {
  tipo: "disciplina" | "modulo" | "material" | "concurso" | "noticia" | "cronograma";
  id: string;
  titulo: string;
  subtitulo?: string | null;
  link: string;
};

export const buscaGlobal = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ q: z.string().trim().min(1).max(200) }).parse(d))
  .handler(async ({ data, context }): Promise<BuscaResultado[]> => {
    const q = data.q.replace(/[%_]/g, "");
    const pattern = `%${q}%`;
    const { supabase } = context;

    const [disc, mods, mats, conc, noti, cron] = await Promise.all([
      supabase.from("disciplinas").select("id, nome, descricao").ilike("nome", pattern).limit(5),
      supabase.from("modulos").select("id, nome, disciplina_id").ilike("nome", pattern).limit(5),
      supabase
        .from("materiais")
        .select("id, titulo, descricao, disciplinas(nome)")
        .ilike("titulo", pattern)
        .eq("publicado", true)
        .limit(8),
      supabase
        .from("concursos")
        .select("id, nome, banca, slug")
        .ilike("nome", pattern)
        .eq("publicado", true)
        .limit(5),
      supabase
        .from("noticias")
        .select("id, titulo, resumo")
        .ilike("titulo", pattern)
        .eq("publicado", true)
        .limit(5),
      supabase.from("cronogramas").select("id, nome").ilike("nome", pattern).eq("publicado", true).limit(5),
    ]);

    const out: BuscaResultado[] = [];
    (disc.data ?? []).forEach((r: any) =>
      out.push({ tipo: "disciplina", id: r.id, titulo: r.nome, subtitulo: r.descricao, link: `/acervo` }),
    );
    (mods.data ?? []).forEach((r: any) =>
      out.push({ tipo: "modulo", id: r.id, titulo: r.nome, subtitulo: null, link: `/acervo` }),
    );
    (mats.data ?? []).forEach((r: any) =>
      out.push({
        tipo: "material",
        id: r.id,
        titulo: r.titulo,
        subtitulo: r.disciplinas?.nome ?? r.descricao,
        link: `/materiais/${r.id}/questoes`,
      }),
    );
    (conc.data ?? []).forEach((r: any) =>
      out.push({ tipo: "concurso", id: r.id, titulo: r.nome, subtitulo: r.banca, link: `/concursos` }),
    );
    (noti.data ?? []).forEach((r: any) =>
      out.push({ tipo: "noticia", id: r.id, titulo: r.titulo, subtitulo: r.resumo, link: `/dashboard` }),
    );
    (cron.data ?? []).forEach((r: any) =>
      out.push({ tipo: "cronograma", id: r.id, titulo: r.nome, subtitulo: null, link: `/dashboard` }),
    );
    return out;
  });
