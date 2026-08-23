import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  assertAcessoAluno,
  assertAdmin,
  criarUrlAssinada,
  montarStoragePath,
  removerArquivo,
} from "@/lib/acervo.server";
import { contarQuestoesPorMaterial } from "@/lib/questoes-count";


// ===================== ADMIN =====================

export const adminListAcervo = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { supabase } = context;

    const [
      { data: disciplinas },
      { data: modulos },
      { data: materiais },
      contagem,
      { data: senhas },
    ] = await Promise.all([
        supabase
          .from("disciplinas")
          .select("id, nome, descricao, ordem, grupo, protegida")
          .eq("especifica", false)
          .order("ordem"),
        supabase.from("modulos").select("id, nome, disciplina_id, ordem").order("ordem"),
        supabase
          .from("materiais")
          .select(
            "id, titulo, descricao, disciplina_id, modulo_id, publicado, versao, ordem, storage_path, tamanho_bytes, paginas, download_permitido, publicado_em, atualizado_em",
          )
          .order("ordem"),
        contarQuestoesPorMaterial(supabase),
        supabase.from("disciplina_senhas").select("disciplina_id, senha"),
      ]);

    const senhaMap = new Map<string, string>(
      (senhas ?? []).map((s: any) => [s.disciplina_id, s.senha]),
    );

    return {
      disciplinas: (disciplinas ?? []).map((d: any) => ({
        ...d,
        senha: senhaMap.get(d.id) ?? "",
        modulos: (modulos ?? []).filter((m: any) => m.disciplina_id === d.id),
        materiais: (materiais ?? [])
          .filter((m: any) => m.disciplina_id === d.id)
          .map((m: any) => ({ ...m, total_questoes: contagem.get(m.id) ?? 0 })),
      })),
      sem_disciplina: (materiais ?? [])
        .filter((m: any) => !m.disciplina_id)
        .map((m: any) => ({ ...m, total_questoes: contagem.get(m.id) ?? 0 })),
    };
  });

export const adminUpsertDisciplina = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        id: z.string().uuid().optional(),
        nome: z.string().trim().min(1).max(200),
        descricao: z.string().trim().max(1000).optional().default(""),
        ordem: z.number().int().min(0).default(0),
        grupo: z.enum(["gerais", "especificos"]).default("gerais"),
        senha: z.string().trim().max(100).optional().default(""),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const payload = {
      nome: data.nome,
      descricao: data.descricao || null,
      ordem: data.ordem,
      grupo: data.grupo,
    };
    const senha = data.senha.trim();

    const gravarSenha = async (disciplinaId: string) => {
      if (senha) {
        const { error } = await context.supabase
          .from("disciplina_senhas")
          .upsert({ disciplina_id: disciplinaId, senha, updated_at: new Date().toISOString() });
        if (error) throw new Error(error.message);
      } else {
        const { error } = await context.supabase
          .from("disciplina_senhas")
          .delete()
          .eq("disciplina_id", disciplinaId);
        if (error) throw new Error(error.message);
      }
    };

    if (data.id) {
      const { error } = await context.supabase.from("disciplinas").update(payload).eq("id", data.id);
      if (error) throw new Error(error.message);
      await gravarSenha(data.id);
      return { id: data.id };
    }
    const slug =
      data.nome
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "")
        .slice(0, 60) || `disciplina-${Date.now()}`;
    const { data: ins, error } = await context.supabase
      .from("disciplinas")
      .insert({ ...payload, slug })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    await gravarSenha(ins.id);
    return { id: ins.id };
  });

export const adminDeleteDisciplina = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { error } = await context.supabase.from("disciplinas").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const adminUpsertModulo = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        id: z.string().uuid().optional(),
        disciplina_id: z.string().uuid(),
        nome: z.string().trim().min(1).max(200),
        ordem: z.number().int().min(0).default(0),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const payload = { disciplina_id: data.disciplina_id, nome: data.nome, ordem: data.ordem };
    if (data.id) {
      const { error } = await context.supabase.from("modulos").update(payload).eq("id", data.id);
      if (error) throw new Error(error.message);
      return { id: data.id };
    }
    const { data: ins, error } = await context.supabase
      .from("modulos")
      .insert(payload)
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { id: ins.id };
  });

export const adminDeleteModulo = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { error } = await context.supabase.from("modulos").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const adminUpsertMaterial = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        id: z.string().uuid().optional(),
        titulo: z.string().trim().min(1).max(300),
        descricao: z.string().trim().max(2000).optional().default(""),
        disciplina_id: z.string().uuid().nullable().optional(),
        modulo_id: z.string().uuid().nullable().optional(),
        ordem: z.number().int().min(0).default(0),
        publicado: z.boolean().default(true),
        download_permitido: z.boolean().default(false),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const payload = {
      titulo: data.titulo,
      descricao: data.descricao || null,
      disciplina_id: data.disciplina_id ?? null,
      modulo_id: data.modulo_id ?? null,
      ordem: data.ordem,
      publicado: data.publicado,
      download_permitido: data.download_permitido,
    };
    if (data.id) {
      const { error } = await context.supabase.from("materiais").update(payload).eq("id", data.id);
      if (error) throw new Error(error.message);
      return { id: data.id };
    }
    const { data: ins, error } = await context.supabase
      .from("materiais")
      .insert({ ...payload, versao: 1, publicado_em: new Date().toISOString() })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { id: ins.id };
  });

export const adminDeleteMaterial = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { data: versoes } = await context.supabase
      .from("material_versoes")
      .select("storage_path")
      .eq("material_id", data.id);
    for (const v of versoes ?? []) {
      if (v.storage_path) await removerArquivo(v.storage_path);
    }
    const { error } = await context.supabase.from("materiais").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/** Gera um link temporário de upload direto para o bucket privado. */
export const adminCriarUploadUrl = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        material_id: z.string().uuid(),
        nome_arquivo: z.string().trim().min(1).max(255),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { data: material } = await context.supabase
      .from("materiais")
      .select("versao")
      .eq("id", data.material_id)
      .maybeSingle();
    const proximaVersao = (material?.versao ?? 0) + 1;
    const storagePath = montarStoragePath(data.material_id, proximaVersao, data.nome_arquivo);

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: signed, error } = await supabaseAdmin.storage
      .from("materiais")
      .createSignedUploadUrl(storagePath);
    if (error || !signed) throw new Error(error?.message ?? "Falha ao preparar o upload.");

    return { storage_path: storagePath, token: signed.token, versao: proximaVersao };
  });

/** Registra o arquivo enviado como nova versão do material. */
export const adminRegistrarArquivo = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        material_id: z.string().uuid(),
        storage_path: z.string().trim().min(1).max(500),
        tamanho_bytes: z.number().int().min(0).optional(),
        paginas: z.number().int().min(1).max(20000).optional(),
        notas: z.string().trim().max(1000).optional().default(""),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabase, userId } = context;

    const { data: material, error: mErr } = await supabase
      .from("materiais")
      .select("versao, storage_path")
      .eq("id", data.material_id)
      .maybeSingle();
    if (mErr || !material) throw new Error("Material não encontrado.");

    const primeiraVersao = !material.storage_path;
    const novaVersao = primeiraVersao ? 1 : (material.versao ?? 1) + 1;
    const agora = new Date().toISOString();

    const { error: vErr } = await supabase.from("material_versoes").insert({
      material_id: data.material_id,
      versao: novaVersao,
      storage_path: data.storage_path,
      notas: data.notas || null,
      created_by: userId,
    });
    if (vErr) throw new Error(vErr.message);

    const { error: uErr } = await supabase
      .from("materiais")
      .update({
        storage_path: data.storage_path,
        tamanho_bytes: data.tamanho_bytes ?? null,
        paginas: data.paginas ?? null,
        versao: novaVersao,
        atualizado_em: primeiraVersao ? null : agora,
        publicado_em: primeiraVersao ? agora : undefined,
      })
      .eq("id", data.material_id);
    if (uErr) throw new Error(uErr.message);

    await supabase.from("admin_logs").insert({
      acao: primeiraVersao ? "material.arquivo_enviado" : "material.arquivo_substituido",
      entidade: "materiais",
      entidade_id: data.material_id,
      metadata: { versao: novaVersao, storage_path: data.storage_path },
    });

    return { versao: novaVersao };
  });

export const adminListVersoesMaterial = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ material_id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { data: versoes, error } = await context.supabase
      .from("material_versoes")
      .select("id, versao, notas, created_at, storage_path")
      .eq("material_id", data.material_id)
      .order("versao", { ascending: false });
    if (error) throw new Error(error.message);
    return versoes ?? [];
  });

/** Link temporário de leitura para o admin conferir o arquivo. */
export const adminUrlArquivo = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ storage_path: z.string().trim().min(1).max(500) }).parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    return { url: await criarUrlAssinada(data.storage_path, 1800) };
  });

// ===================== ALUNO =====================

/** Confere a senha de uma disciplina protegida. Nunca retorna a senha em si. */
export const alunoVerificarSenhaDisciplina = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({ disciplina_id: z.string().uuid(), senha: z.string().trim().min(1).max(100) })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertAcessoAluno(context);
    const { data: ok, error } = await context.supabase.rpc("verificar_senha_disciplina", {
      _disciplina_id: data.disciplina_id,
      _senha: data.senha,
    });
    if (error) throw new Error(error.message);
    return { ok: !!ok };
  });

/** Abre um material: metadados, progresso de leitura e link temporário do PDF. */
export const alunoAbrirMaterial = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ material_id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAcessoAluno(context);
    const { supabase, userId } = context;

    const { data: material, error } = await supabase
      .from("materiais")
      .select(
        "id, titulo, descricao, versao, paginas, publicado, download_permitido, storage_path, publicado_em, atualizado_em, disciplinas(nome), modulos(nome)",
      )
      .eq("id", data.material_id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!material || !material.publicado) throw new Error("Material indisponível.");

    const [{ data: leitura }, { count: totalQuestoes }] = await Promise.all([
      supabase
        .from("material_leitura")
        .select("ultima_pagina, versao_vista, updated_at")
        .eq("user_id", userId)
        .eq("material_id", data.material_id)
        .maybeSingle(),
      supabase
        .from("questoes")
        .select("id", { count: "exact", head: true })
        .eq("material_id", data.material_id)
        .eq("publicado", true),
    ]);

    const url = material.storage_path ? await criarUrlAssinada(material.storage_path, 3600) : null;

    return {
      material: {
        id: material.id,
        titulo: material.titulo,
        descricao: material.descricao,
        versao: material.versao ?? 1,
        paginas: material.paginas,
        download_permitido: material.download_permitido,
        disciplina: (material as any).disciplinas?.nome ?? "Sem disciplina",
        modulo: (material as any).modulos?.nome ?? null,
        atualizado_em: material.atualizado_em,
      },
      url,
      leitura: leitura ?? null,
      total_questoes: totalQuestoes ?? 0,
    };
  });
