import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { assertAcessoAluno, assertAdmin, gerarSlug } from "@/lib/acervo.server";
import { contarQuestoesPorMaterial } from "@/lib/questoes-count";

// ===================== ADMIN =====================

/** Disciplinas específicas (fora do Acervo Base), agrupadas por concurso. */
export const adminListDisciplinasEspecificas = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { supabase } = context;

    const [{ data: concursos }, { data: disciplinas }, { data: materiais }, contagem, { data: base }] =
      await Promise.all([
        supabase.from("concursos").select("id, nome, orgao, publicado").order("nome"),
        (supabase as any)
          .from("disciplinas")
          .select("id, nome, descricao, ordem, concurso_id, grupo, disciplina_base_id")
          .eq("especifica", true)
          .order("ordem"),
        supabase
          .from("materiais")
          .select("id, titulo, descricao, disciplina_id, publicado, ordem, tipo")
          .order("ordem"),
        contarQuestoesPorMaterial(supabase),
        // Disciplinas do Acervo Base que podem receber matérias complementares.
        supabase.from("disciplinas").select("id, nome, codigo").eq("especifica", false).order("ordem"),
      ]);


    return {
      concursos: concursos ?? [],
      base: base ?? [],
      disciplinas: (disciplinas ?? []).map((d: any) => ({
        ...d,
        materiais: (materiais ?? [])
          .filter((m: any) => m.disciplina_id === d.id)
          .map((m: any) => ({ ...m, total_questoes: contagem.get(m.id) ?? 0 })),
      })),
    };
  });

export const adminUpsertDisciplinaEspecifica = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        id: z.string().uuid().optional(),
        nome: z.string().trim().min(1).max(200),
        descricao: z.string().trim().max(1000).optional().default(""),
        concurso_id: z.string().uuid(),
        ordem: z.number().int().min(0).default(0),
        // Prova do edital a que a disciplina pertence (Conhecimentos Gerais ou Específicos).
        grupo: z.enum(["gerais", "especificos"]).optional(),
        // Disciplina do Acervo Base à qual a específica se junta (null = disciplina própria do concurso).
        disciplina_base_id: z.string().uuid().nullable().optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    if (data.disciplina_base_id) {
      const { data: base } = await context.supabase
        .from("disciplinas")
        .select("id, especifica")
        .eq("id", data.disciplina_base_id)
        .maybeSingle();
      if (!base || base.especifica) throw new Error("Escolha uma disciplina do Acervo Base.");
      if (data.id && data.id === data.disciplina_base_id) throw new Error("A disciplina não pode ser base dela mesma.");
    }
    const payload: Record<string, unknown> = {
      nome: data.nome,
      descricao: data.descricao || null,
      concurso_id: data.concurso_id,
      ordem: data.ordem,
      especifica: true,
    };
    if (data.grupo) payload.grupo = data.grupo;
    if (data.disciplina_base_id !== undefined) payload.disciplina_base_id = data.disciplina_base_id;
    if (data.id) {
      const { error } = await (context.supabase as any)
        .from("disciplinas")
        .update(payload)
        .eq("id", data.id);
      if (error) throw new Error(error.message);
      return { id: data.id };
    }
    const { data: ins, error } = await (context.supabase as any)
      .from("disciplinas")
      .insert({ ...payload, slug: gerarSlug(data.nome) })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { id: ins.id };
  });

export const adminDeleteDisciplinaEspecifica = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { error } = await context.supabase
      .from("disciplinas")
      .delete()
      .eq("id", data.id)
      .eq("especifica", true);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ===================== ALUNO =====================

/** Concursos abertos que possuem disciplinas específicas (link exibido no Cronograma). */
export const alunoListConcursosEspecificos = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAcessoAluno(context);
    const { supabase } = context;

    const [{ data: concursos }, { data: disciplinas }] = await Promise.all([
      supabase
        .from("concursos")
        .select("id, nome, orgao, banca, estado, ano, data_prova")
        .eq("publicado", true)
        .order("created_at", { ascending: false }),
      supabase
        .from("disciplinas")
        .select("id, nome, concurso_id")
        .eq("especifica", true),
    ]);

    return (concursos ?? [])
      .map((c: any) => ({
        ...c,
        total_disciplinas: (disciplinas ?? []).filter((d: any) => d.concurso_id === c.id).length,
      }))
      .filter((c: any) => c.total_disciplinas > 0);
  });

/** Disciplinas específicas de um concurso (nunca inclui o Acervo Base). */
export const alunoGetConcursoEspecifico = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ concurso_id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAcessoAluno(context);
    const { supabase } = context;

    const [{ data: concurso }, { data: disciplinas }] = await Promise.all([
      supabase
        .from("concursos")
        .select("id, nome, orgao, banca, estado, ano, data_prova, edital_url, observacoes")
        .eq("id", data.concurso_id)
        .eq("publicado", true)
        .maybeSingle(),
      supabase
        .from("disciplinas")
        .select("id, nome, descricao, ordem")
        .eq("especifica", true)
        .eq("concurso_id", data.concurso_id)
        .order("ordem"),
    ]);
    if (!concurso) throw new Error("Concurso indisponível.");

    const ids = (disciplinas ?? []).map((d: any) => d.id);
    const { data: materiais } = ids.length
      ? await supabase
          .from("materiais")
          .select("id, titulo, descricao, disciplina_id, ordem, tipo")
          .in("disciplina_id", ids)
          .eq("publicado", true)
          .order("ordem")
      : { data: [] as any[] };

    return {
      concurso,
      disciplinas: (disciplinas ?? []).map((d: any) => ({
        ...d,
        materiais: (materiais ?? []).filter((m: any) => m.disciplina_id === d.id),
      })),
    };
  });
