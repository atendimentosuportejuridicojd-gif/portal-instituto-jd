import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { assertAdmin, gerarSlug } from "@/lib/acervo.server";

// ===================== ADMIN =====================

export const adminListTrilhas = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { supabase } = context;
    const [{ data: trilhas }, { data: vinculos }, { data: materiais }] = await Promise.all([
      supabase.from("trilhas").select("id, nome, descricao, ordem, slug").order("ordem"),
      supabase.from("trilha_materiais").select("trilha_id, material_id, ordem").order("ordem"),
      supabase
        .from("materiais")
        .select("id, titulo, publicado, storage_path, disciplinas(nome)")
        .order("titulo"),
    ]);

    const mats = (materiais ?? []).map((m: any) => ({
      id: m.id,
      titulo: m.titulo,
      publicado: m.publicado,
      tem_arquivo: !!m.storage_path,
      disciplina: m.disciplinas?.nome ?? "Sem disciplina",
    }));
    const byId = new Map(mats.map((m) => [m.id, m]));

    return {
      trilhas: (trilhas ?? []).map((t: any) => ({
        ...t,
        materiais: (vinculos ?? [])
          .filter((v: any) => v.trilha_id === t.id)
          .map((v: any) => ({ ...byId.get(v.material_id), ordem: v.ordem }))
          .filter((m: any) => m.id),
      })),
      materiais: mats,
    };
  });

export const adminUpsertTrilha = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        id: z.string().uuid().optional(),
        nome: z.string().trim().min(1).max(200),
        descricao: z.string().trim().max(2000).optional().default(""),
        ordem: z.number().int().min(0).default(0),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const payload = { nome: data.nome, descricao: data.descricao || null, ordem: data.ordem };
    if (data.id) {
      const { error } = await context.supabase.from("trilhas").update(payload).eq("id", data.id);
      if (error) throw new Error(error.message);
      return { id: data.id };
    }
    const { data: ins, error } = await context.supabase
      .from("trilhas")
      .insert({ ...payload, slug: gerarSlug(data.nome) })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { id: ins.id };
  });

export const adminDeleteTrilha = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { error } = await context.supabase.from("trilhas").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/** Vincula/desvincula material na trilha — o arquivo nunca é duplicado. */
export const adminToggleMaterialTrilha = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        trilha_id: z.string().uuid(),
        material_id: z.string().uuid(),
        vincular: z.boolean(),
        ordem: z.number().int().min(0).default(0),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    if (!data.vincular) {
      const { error } = await context.supabase
        .from("trilha_materiais")
        .delete()
        .eq("trilha_id", data.trilha_id)
        .eq("material_id", data.material_id);
      if (error) throw new Error(error.message);
      return { vinculado: false };
    }
    const { error } = await context.supabase.from("trilha_materiais").upsert(
      { trilha_id: data.trilha_id, material_id: data.material_id, ordem: data.ordem },
      { onConflict: "trilha_id,material_id" },
    );
    if (error) throw new Error(error.message);
    return { vinculado: true };
  });

export const adminListConcursos = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { supabase } = context;
    const [{ data: concursos }, { data: vinculos }, { data: materiais }] = await Promise.all([
      supabase
        .from("concursos")
        .select("id, nome, orgao, banca, estado, ano, data_prova, edital_url, observacoes, publicado")
        .order("created_at", { ascending: false }),
      supabase
        .from("concurso_materiais")
        .select("concurso_id, material_id, ordem, exclusivo")
        .order("ordem"),
      supabase
        .from("materiais")
        .select("id, titulo, publicado, storage_path, disciplinas(nome)")
        .order("titulo"),
    ]);

    const mats = (materiais ?? []).map((m: any) => ({
      id: m.id,
      titulo: m.titulo,
      publicado: m.publicado,
      tem_arquivo: !!m.storage_path,
      disciplina: m.disciplinas?.nome ?? "Sem disciplina",
    }));
    const byId = new Map(mats.map((m) => [m.id, m]));

    return {
      concursos: (concursos ?? []).map((c: any) => ({
        ...c,
        materiais: (vinculos ?? [])
          .filter((v: any) => v.concurso_id === c.id)
          .map((v: any) => ({ ...byId.get(v.material_id), ordem: v.ordem, exclusivo: v.exclusivo }))
          .filter((m: any) => m.id),
      })),
      materiais: mats,
    };
  });

export const adminUpsertConcurso = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        id: z.string().uuid().optional(),
        nome: z.string().trim().min(1).max(200),
        orgao: z.string().trim().max(200).optional().default(""),
        banca: z.string().trim().max(200).optional().default(""),
        estado: z.string().trim().max(50).optional().default(""),
        ano: z.number().int().min(1990).max(2100).nullable().optional(),
        edital_url: z.string().trim().max(500).optional().default(""),
        observacoes: z.string().trim().max(2000).optional().default(""),
        publicado: z.boolean().default(true),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const payload = {
      nome: data.nome,
      orgao: data.orgao || null,
      banca: data.banca || null,
      estado: data.estado || null,
      ano: data.ano ?? null,
      edital_url: data.edital_url || null,
      observacoes: data.observacoes || null,
      publicado: data.publicado,
    };
    if (data.id) {
      const { error } = await context.supabase.from("concursos").update(payload).eq("id", data.id);
      if (error) throw new Error(error.message);
      return { id: data.id };
    }
    const { data: ins, error } = await context.supabase
      .from("concursos")
      .insert({ ...payload, slug: gerarSlug(data.nome) })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { id: ins.id };
  });

export const adminDeleteConcurso = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { error } = await context.supabase.from("concursos").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const adminToggleMaterialConcurso = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        concurso_id: z.string().uuid(),
        material_id: z.string().uuid(),
        vincular: z.boolean(),
        exclusivo: z.boolean().default(false),
        ordem: z.number().int().min(0).default(0),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    if (!data.vincular) {
      const { error } = await context.supabase
        .from("concurso_materiais")
        .delete()
        .eq("concurso_id", data.concurso_id)
        .eq("material_id", data.material_id);
      if (error) throw new Error(error.message);
      return { vinculado: false };
    }
    const { error } = await context.supabase.from("concurso_materiais").upsert(
      {
        concurso_id: data.concurso_id,
        material_id: data.material_id,
        exclusivo: data.exclusivo,
        ordem: data.ordem,
      },
      { onConflict: "concurso_id,material_id" },
    );
    if (error) throw new Error(error.message);
    return { vinculado: true };
  });

// ===================== ALUNO =====================

export const alunoListTrilhas = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const [{ data: trilhas }, { data: vinculos }, { data: materiais }, { data: favs }] =
      await Promise.all([
        supabase.from("trilhas").select("id, nome, descricao, ordem").order("ordem"),
        supabase.from("trilha_materiais").select("trilha_id, material_id, ordem").order("ordem"),
        supabase
          .from("materiais")
          .select("id, titulo, versao, storage_path, disciplinas(nome)")
          .eq("publicado", true),
        supabase.from("favoritos").select("item_id").eq("user_id", userId).eq("tipo", "trilha"),
      ]);

    const byId = new Map((materiais ?? []).map((m: any) => [m.id, m]));
    const favSet = new Set((favs ?? []).map((f: any) => f.item_id));

    return (trilhas ?? []).map((t: any) => ({
      id: t.id,
      nome: t.nome,
      descricao: t.descricao,
      favorito: favSet.has(t.id),
      materiais: (vinculos ?? [])
        .filter((v: any) => v.trilha_id === t.id && byId.has(v.material_id))
        .map((v: any) => {
          const m: any = byId.get(v.material_id);
          return {
            id: m.id,
            titulo: m.titulo,
            versao: m.versao ?? 1,
            tem_arquivo: !!m.storage_path,
            disciplina: m.disciplinas?.nome ?? "Sem disciplina",
          };
        }),
    }));
  });

export const alunoListConcursos = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const [{ data: concursos }, { data: vinculos }, { data: materiais }, { data: favs }] =
      await Promise.all([
        supabase
          .from("concursos")
          .select("id, nome, orgao, banca, estado, ano, data_prova, edital_url, observacoes")
          .eq("publicado", true)
          .order("created_at", { ascending: false }),
        supabase
          .from("concurso_materiais")
          .select("concurso_id, material_id, ordem, exclusivo")
          .order("ordem"),
        supabase
          .from("materiais")
          .select("id, titulo, versao, storage_path, disciplinas(nome)")
          .eq("publicado", true),
        supabase.from("favoritos").select("item_id").eq("user_id", userId).eq("tipo", "concurso"),
      ]);

    const byId = new Map((materiais ?? []).map((m: any) => [m.id, m]));
    const favSet = new Set((favs ?? []).map((f: any) => f.item_id));

    return (concursos ?? []).map((c: any) => ({
      ...c,
      favorito: favSet.has(c.id),
      materiais: (vinculos ?? [])
        .filter((v: any) => v.concurso_id === c.id && byId.has(v.material_id))
        .map((v: any) => {
          const m: any = byId.get(v.material_id);
          return {
            id: m.id,
            titulo: m.titulo,
            versao: m.versao ?? 1,
            exclusivo: v.exclusivo,
            tem_arquivo: !!m.storage_path,
            disciplina: m.disciplinas?.nome ?? "Sem disciplina",
          };
        }),
    }));
  });
