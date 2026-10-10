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
      disciplina_id: m.disciplina_id as string | null,
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
    const [{ data: concursos }, { data: vinculos }, { data: materiais }, { data: estrutura }, { data: disciplinas }, { data: excecoes }] =
      await Promise.all([
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
        .select("id, titulo, publicado, storage_path, disciplina_id, disciplinas(nome)")
        .order("titulo"),
      (supabase as any)
        .from("concurso_prova_estrutura")
        .select("concurso_id, disciplina_id, qtd_questoes, peso, ordem")
        .order("ordem"),
      (supabase as any).from("disciplinas").select("id, nome, especifica, concurso_id, disciplina_base_id").order("nome"),
      (supabase as any).from("concurso_materiais_excecao").select("concurso_id, material_id, disciplina_id"),
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
      disciplinas: disciplinas ?? [],
      concursos: (concursos ?? []).map((c: any) => ({
        ...c,
        estrutura: (estrutura ?? []).filter((e: any) => e.concurso_id === c.id),
        excecoes: (excecoes ?? []).filter((e: any) => e.concurso_id === c.id),
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
        // Data da prova (YYYY-MM-DD); vazio = ainda sem data.
        data_prova: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).or(z.literal("")).optional().default(""),
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
      data_prova: data.data_prova || null,
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

/** Substitui a estrutura da prova do concurso (questões e peso por disciplina). */
export const adminSalvarEstruturaProva = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        concurso_id: z.string().uuid(),
        linhas: z
          .array(
            z.object({
              disciplina_id: z.string().uuid(),
              qtd_questoes: z.number().int().min(1).max(500),
              peso: z.number().min(0.01).max(99),
            }),
          )
          .max(60),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const db = context.supabase as any;
    const ids = new Set(data.linhas.map((l) => l.disciplina_id));
    if (ids.size !== data.linhas.length) throw new Error("Há disciplinas repetidas na estrutura.");

    const { data: atuais, error: e1 } = await db
      .from("concurso_prova_estrutura")
      .select("disciplina_id")
      .eq("concurso_id", data.concurso_id);
    if (e1) throw new Error(e1.message);
    const remover = (atuais ?? []).map((a: any) => a.disciplina_id).filter((id: string) => !ids.has(id));
    if (remover.length) {
      const { error } = await db
        .from("concurso_prova_estrutura")
        .delete()
        .eq("concurso_id", data.concurso_id)
        .in("disciplina_id", remover);
      if (error) throw new Error(error.message);
    }
    if (data.linhas.length) {
      const { error } = await db.from("concurso_prova_estrutura").upsert(
        data.linhas.map((l, i) => ({ concurso_id: data.concurso_id, ...l, ordem: i })),
        { onConflict: "concurso_id,disciplina_id" },
      );
      if (error) throw new Error(error.message);
    }
    await context.supabase.from("admin_logs").insert({
      user_id: context.userId,
      acao: "concurso.estrutura_prova",
      entidade: "concursos",
      entidade_id: data.concurso_id,
      metadata: { disciplinas: data.linhas.length },
    });
    return { ok: true };
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

/**
 * "Vincular materiais exceção": define quais matérias (de qualquer disciplina) contam dentro de uma disciplina da
 * estrutura da prova do concurso. Substitui a seleção anterior daquela disciplina: marcadas passam a contar nela;
 * desmarcadas voltam à disciplina de origem. Não mexe em "Vincular materiais" (concurso_materiais).
 */
export const adminDefinirMateriaisExcecao = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        concurso_id: z.string().uuid(),
        disciplina_id: z.string().uuid(),
        material_ids: z.array(z.string().uuid()).max(500),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const db = context.supabase as any;

    const { data: naEstrutura } = await db
      .from("concurso_prova_estrutura")
      .select("disciplina_id")
      .eq("concurso_id", data.concurso_id)
      .eq("disciplina_id", data.disciplina_id)
      .maybeSingle();
    if (!naEstrutura) throw new Error("Escolha uma disciplina que faça parte da estrutura da prova deste concurso.");

    const ids = [...new Set(data.material_ids)];
    // Matérias da própria disciplina de destino já contam nela: não precisam de exceção.
    const { data: proprias } = ids.length
      ? await db.from("materiais").select("id").in("id", ids).eq("disciplina_id", data.disciplina_id)
      : { data: [] as any[] };
    const proprio = new Set<string>((proprias ?? []).map((m: any) => m.id));
    const alvo = ids.filter((id) => !proprio.has(id));

    // Desmarcadas: saem da exceção (voltam à disciplina de origem).
    const { data: atuais, error: eAt } = await db
      .from("concurso_materiais_excecao")
      .select("material_id")
      .eq("concurso_id", data.concurso_id)
      .eq("disciplina_id", data.disciplina_id);
    if (eAt) throw new Error(eAt.message);
    const soltar = (atuais ?? []).map((r: any) => r.material_id).filter((id: string) => !alvo.includes(id));
    if (soltar.length) {
      const { error } = await db
        .from("concurso_materiais_excecao")
        .delete()
        .eq("concurso_id", data.concurso_id)
        .eq("disciplina_id", data.disciplina_id)
        .in("material_id", soltar);
      if (error) throw new Error(error.message);
    }
    // Marcadas: uma matéria tem um único destino por concurso (se já estava em outro, passa para este).
    if (alvo.length) {
      const { error } = await db.from("concurso_materiais_excecao").upsert(
        alvo.map((material_id) => ({
          concurso_id: data.concurso_id,
          material_id,
          disciplina_id: data.disciplina_id,
        })),
        { onConflict: "concurso_id,material_id" },
      );
      if (error) throw new Error(error.message);
    }
    await context.supabase.from("admin_logs").insert({
      user_id: context.userId,
      acao: "concurso.materiais_excecao",
      entidade: "concursos",
      entidade_id: data.concurso_id,
      metadata: { disciplina_id: data.disciplina_id, incluidas: alvo.length, devolvidas: soltar.length },
    });
    return { incluidas: alvo.length, devolvidas: soltar.length };
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
    const [{ data: concursos }, { data: favs }] = await Promise.all([
      supabase
        .from("concursos")
        .select("id, nome, orgao, banca, estado, ano, data_prova, edital_url, observacoes")
        .eq("publicado", true)
        .order("created_at", { ascending: false }),
      supabase.from("favoritos").select("item_id").eq("user_id", userId).eq("tipo", "concurso"),
    ]);

    const favSet = new Set((favs ?? []).map((f: any) => f.item_id));

    // Somente dados de consulta: a lista de matérias do concurso é exclusiva do painel do administrador.
    return (concursos ?? []).map((c: any) => ({ ...c, favorito: favSet.has(c.id) }));
  });
