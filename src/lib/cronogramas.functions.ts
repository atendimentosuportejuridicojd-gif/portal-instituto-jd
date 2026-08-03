import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { assertAcessoAluno, assertAdmin } from "@/lib/acervo.server";

// ===================== ADMIN =====================

export const adminListCronogramas = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { supabase } = context;

    const [{ data: cronos }, { data: itens }, { data: materiais }, { data: trilhas }, { data: concursos }] =
      await Promise.all([
        supabase
          .from("cronogramas")
          .select("id, nome, descricao, publicado, trilha_id, concurso_id, created_at")
          .order("nome"),
        supabase
          .from("cronograma_itens")
          .select("id, cronograma_id, material_id, titulo, observacoes, dia, ordem")
          .order("dia")
          .order("ordem"),
        supabase.from("materiais").select("id, titulo").order("titulo"),
        supabase.from("trilhas").select("id, nome").order("nome"),
        supabase.from("concursos").select("id, nome").order("nome"),
      ]);

    return {
      cronogramas: (cronos ?? []).map((c: any) => ({
        ...c,
        itens: (itens ?? []).filter((i: any) => i.cronograma_id === c.id),
      })),
      materiais: materiais ?? [],
      trilhas: trilhas ?? [],
      concursos: concursos ?? [],
    };
  });

export const adminUpsertCronograma = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        id: z.string().uuid().optional(),
        nome: z.string().trim().min(1).max(180),
        descricao: z.string().trim().max(2000).optional().nullable(),
        trilha_id: z.string().uuid().nullable().optional(),
        concurso_id: z.string().uuid().nullable().optional(),
        publicado: z.boolean().default(false),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const payload = {
      nome: data.nome,
      descricao: data.descricao ?? null,
      trilha_id: data.trilha_id ?? null,
      concurso_id: data.concurso_id ?? null,
      publicado: data.publicado,
    };
    const { error } = data.id
      ? await context.supabase.from("cronogramas").update(payload).eq("id", data.id)
      : await context.supabase.from("cronogramas").insert(payload);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const adminDeleteCronograma = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { error } = await context.supabase.from("cronogramas").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const adminUpsertCronogramaItem = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        id: z.string().uuid().optional(),
        cronograma_id: z.string().uuid(),
        material_id: z.string().uuid().nullable().optional(),
        titulo: z.string().trim().min(1).max(200),
        observacoes: z.string().trim().max(1000).optional().nullable(),
        dia: z.number().int().min(1).max(999).default(1),
        ordem: z.number().int().min(0).max(999).default(0),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const payload = {
      cronograma_id: data.cronograma_id,
      material_id: data.material_id ?? null,
      titulo: data.titulo,
      observacoes: data.observacoes ?? null,
      dia: data.dia,
      ordem: data.ordem,
    };
    const { error } = data.id
      ? await context.supabase.from("cronograma_itens").update(payload).eq("id", data.id)
      : await context.supabase.from("cronograma_itens").insert(payload);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const adminDeleteCronogramaItem = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { error } = await context.supabase.from("cronograma_itens").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ===================== ALUNO =====================

export const alunoListCronogramas = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAcessoAluno(context);
    const { supabase } = context;

    const { data: cronos, error } = await supabase
      .from("cronogramas")
      .select("id, nome, descricao, trilha_id, concurso_id, trilhas(nome), concursos(nome)")
      .eq("publicado", true)
      .order("nome");
    if (error) throw new Error(error.message);

    const ids = (cronos ?? []).map((c: any) => c.id);
    const { data: itens } = ids.length
      ? await supabase
          .from("cronograma_itens")
          .select("id, cronograma_id, material_id, titulo, observacoes, dia, ordem, materiais(id, titulo, publicado)")
          .in("cronograma_id", ids)
          .order("dia")
          .order("ordem")
      : { data: [] as any[] };

    return (cronos ?? []).map((c: any) => ({
      id: c.id,
      nome: c.nome,
      descricao: c.descricao,
      contexto: c.trilhas?.nome ?? c.concursos?.nome ?? null,
      itens: (itens ?? [])
        .filter((i: any) => i.cronograma_id === c.id)
        .map((i: any) => ({
          id: i.id,
          titulo: i.titulo,
          observacoes: i.observacoes,
          dia: i.dia,
          material_id: i.materiais?.publicado ? i.material_id : null,
          material_titulo: i.materiais?.publicado ? i.materiais.titulo : null,
        })),
    }));
  });
