import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { assertAcessoAluno, assertAdmin, gerarSlug } from "@/lib/acervo.server";

// ===================== ADMIN =====================

/** Disciplinas específicas (fora do Acervo Base), agrupadas por concurso. */
export const adminListDisciplinasEspecificas = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { supabase } = context;

    const [{ data: concursos }, { data: disciplinas }, { data: materiais }, { data: questoes }] =
      await Promise.all([
        supabase.from("concursos").select("id, nome, orgao, publicado").order("nome"),
        supabase
          .from("disciplinas")
          .select("id, nome, descricao, ordem, concurso_id")
          .eq("especifica", true)
          .order("ordem"),
        supabase
          .from("materiais")
          .select("id, titulo, descricao, disciplina_id, publicado, versao, ordem, storage_path")
          .order("ordem"),
        supabase.from("questoes").select("material_id"),
      ]);

    const contagem = new Map<string, number>();
    (questoes ?? []).forEach((q: any) => {
      if (!q.material_id) return;
      contagem.set(q.material_id, (contagem.get(q.material_id) ?? 0) + 1);
    });

    return {
      concursos: concursos ?? [],
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
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const payload = {
      nome: data.nome,
      descricao: data.descricao || null,
      concurso_id: data.concurso_id,
      ordem: data.ordem,
      especifica: true,
    };
    if (data.id) {
      const { error } = await context.supabase
        .from("disciplinas")
        .update(payload)
        .eq("id", data.id);
      if (error) throw new Error(error.message);
      return { id: data.id };
    }
    const { data: ins, error } = await context.supabase
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
          .select("id, titulo, descricao, disciplina_id, versao, ordem")
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
