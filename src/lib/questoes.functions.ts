import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { assertAcessoAluno } from "@/lib/acervo.server";
import { contarQuestoesPorMaterial } from "@/lib/questoes-count";

// ============ Admin ============

const upsertQuestaoSchema = z.object({
  id: z.string().uuid().optional(),
  material_id: z.string().uuid(),
  referencia: z.string().trim().min(1).max(500),
  enunciado: z.string().trim().min(1),
  comentario_professor: z.string().trim().default(""),
  ordem: z.number().int().default(0),
  publicado: z.boolean().default(true),
  alternativas: z
    .array(
      z.object({
        letra: z.enum(["A", "B", "C", "D", "E"]),
        texto: z.string().trim().min(1),
      }),
    )
    .length(5),
  correta: z.enum(["A", "B", "C", "D", "E"]),
});

async function assertAdmin(ctx: { supabase: any; userId: string }) {
  const { data, error } = await ctx.supabase.rpc("has_role", {
    _user_id: ctx.userId,
    _role: "administrador",
  });
  if (error || !data) throw new Error("Acesso restrito ao administrador.");
}

export const adminUpsertQuestao = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => upsertQuestaoSchema.parse(data))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabase } = context;

    const payload = {
      material_id: data.material_id,
      referencia: data.referencia,
      enunciado: data.enunciado,
      comentario_professor: data.comentario_professor || null,
      ordem: data.ordem,
      publicado: data.publicado,
    };

    let questaoId = data.id;
    if (questaoId) {
      const { error } = await supabase
        .from("questoes")
        .update(payload)
        .eq("id", questaoId);
      if (error) throw new Error(error.message);
      await supabase.from("questao_alternativas").delete().eq("questao_id", questaoId);
    } else {
      const { data: inserted, error } = await supabase
        .from("questoes")
        .insert(payload)
        .select("id")
        .single();
      if (error) throw new Error(error.message);
      questaoId = inserted.id;
    }

    const alts = data.alternativas.map((a, idx) => ({
      questao_id: questaoId!,
      letra: a.letra,
      texto: a.texto,
      correta: a.letra === data.correta,
      ordem: idx,
    }));
    const { error: altErr } = await supabase.from("questao_alternativas").insert(alts);
    if (altErr) throw new Error(altErr.message);

    return { id: questaoId };
  });

export const adminDeleteQuestao = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    await context.supabase.from("questao_alternativas").delete().eq("questao_id", data.id);
    const { error } = await context.supabase.from("questoes").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const adminListQuestoesPorMaterial = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ material_id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { data: questoes, error } = await context.supabase
      .from("questoes")
      .select("id, enunciado, referencia, ordem, publicado, comentario_professor, questao_alternativas(id, letra, texto, correta, ordem)")
      .eq("material_id", data.material_id)
      .order("ordem", { ascending: true });
    if (error) throw new Error(error.message);
    return questoes ?? [];
  });

export const adminListMateriaisComQuestoes = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { data: materiais, error } = await context.supabase
      .from("materiais")
      .select("id, titulo, disciplina_id, disciplinas(id, nome)")
      .order("titulo");
    if (error) throw new Error(error.message);

    const countMap = await contarQuestoesPorMaterial(context.supabase);


    return (materiais ?? []).map((m: any) => ({
      id: m.id,
      titulo: m.titulo,
      disciplina: m.disciplinas?.nome ?? "Sem disciplina",
      disciplina_id: m.disciplina_id,
      total_questoes: countMap.get(m.id) ?? 0,
    }));
  });

// ============ Student ============

export const alunoListMateriaisComProgresso = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAcessoAluno(context);
    const { supabase, userId } = context;
    const { data: materiais, error } = await supabase
      .from("materiais")
      .select(
        "id, titulo, descricao, disciplina_id, versao, publicado_em, atualizado_em, disciplinas(id, nome, especifica, grupo, protegida)",
      )
      .eq("publicado", true)
      .order("titulo");
    if (error) throw new Error(error.message);

    const [{ data: sessoes }, qcountMap, { data: favs }, { data: leituras }] = await Promise.all([
      supabase
        .from("questao_sessoes")
        .select("material_id, percentual, status, concluida_em")
        .eq("user_id", userId)
        .order("concluida_em", { ascending: false, nullsFirst: false }),
      contarQuestoesPorMaterial(supabase, { somentePublicadas: true }),
      supabase.from("favoritos").select("item_id").eq("user_id", userId).eq("tipo", "material"),
      supabase
        .from("material_leitura")
        .select("material_id, ultima_pagina, versao_vista, concluido")
        .eq("user_id", userId),
    ]);

    const bestByMat = new Map<string, { percentual: number }>();
    (sessoes ?? []).forEach((s: any) => {
      if (s.status !== "concluida" || !s.material_id) return;
      if (!bestByMat.has(s.material_id)) bestByMat.set(s.material_id, { percentual: Number(s.percentual) });
    });

    const favSet = new Set((favs ?? []).map((f: any) => f.item_id));
    const leituraMap = new Map((leituras ?? []).map((l: any) => [l.material_id, l]));
    const limiteNovo = Date.now() - 14 * 24 * 60 * 60 * 1000;

    return (materiais ?? []).map((m: any) => {
      const leitura = leituraMap.get(m.id);
      return {
        id: m.id,
        titulo: m.titulo,
        descricao: m.descricao,
        disciplina: m.disciplinas?.nome ?? "Sem disciplina",
        disciplina_id: m.disciplina_id,
        especifica: !!m.disciplinas?.especifica,
        grupo: (m.disciplinas?.grupo as string) ?? "gerais",
        tem_senha: !!m.disciplinas?.protegida,
        total_questoes: qcountMap.get(m.id) ?? 0,
        desempenho: bestByMat.get(m.id)?.percentual ?? null,
        favorito: favSet.has(m.id),
        versao: m.versao ?? 1,
        novo: !!m.publicado_em && new Date(m.publicado_em).getTime() >= limiteNovo && !leitura,
        atualizado: !!leitura && (m.versao ?? 1) > (leitura.versao_vista ?? 1),
        ultima_pagina: leitura?.ultima_pagina ?? null,
        lido: !!leitura?.concluido,
      };
    });
  });

export const iniciarOuRetomarSessao = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ material_id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAcessoAluno(context);
    const { supabase, userId } = context;

    const { data: existing } = await supabase
      .from("questao_sessoes")
      .select("id")
      .eq("user_id", userId)
      .eq("material_id", data.material_id)
      .eq("status", "em_andamento")
      .maybeSingle();

    if (existing) return { sessaoId: existing.id };

    const { count } = await supabase
      .from("questoes")
      .select("id", { count: "exact", head: true })
      .eq("material_id", data.material_id)
      .eq("publicado", true);

    if (!count || count === 0) throw new Error("Este material ainda não possui questões cadastradas.");

    const { data: nova, error } = await supabase
      .from("questao_sessoes")
      .insert({
        user_id: userId,
        material_id: data.material_id,
        total_questoes: count,
        status: "em_andamento",
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { sessaoId: nova.id };
  });

export const getSessaoAtual = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ sessao_id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAcessoAluno(context);
    const { supabase, userId } = context;
    const { data: sessao, error } = await supabase
      .from("questao_sessoes")
      .select("id, material_id, status, total_questoes, acertos, erros, percentual, iniciada_em, concluida_em, materiais(id, titulo, disciplinas(nome))")
      .eq("id", data.sessao_id)
      .eq("user_id", userId)
      .single();
    if (error) throw new Error(error.message);

    const { data: questoes, error: qerr } = await supabase
      .from("questoes")
      .select("id, enunciado, referencia, ordem, questao_alternativas(id, letra, texto, ordem)")
      .eq("material_id", sessao.material_id)
      .eq("publicado", true)
      .order("ordem");
    if (qerr) throw new Error(qerr.message);

    const { data: tentativas } = await supabase
      .from("questao_tentativas")
      .select("questao_id, alternativa_id, acertou")
      .eq("sessao_id", data.sessao_id);

    const respostas = new Map<string, { alternativa_id: string | null; acertou: boolean }>();
    (tentativas ?? []).forEach((t: any) => respostas.set(t.questao_id, t));

    const questoesFmt = (questoes ?? []).map((q: any) => ({
      id: q.id,
      enunciado: q.enunciado,
      referencia: q.referencia,
      alternativas: (q.questao_alternativas ?? [])
        .sort((a: any, b: any) => a.letra.localeCompare(b.letra))
        .map((a: any) => ({ id: a.id, letra: a.letra, texto: a.texto })),
      respondida: respostas.get(q.id) ?? null,
    }));

    return {
      sessao: {
        id: sessao.id,
        material_id: sessao.material_id,
        status: sessao.status,
        total_questoes: sessao.total_questoes,
        acertos: sessao.acertos,
        erros: sessao.erros,
        percentual: Number(sessao.percentual),
        material: (sessao as any).materiais?.titulo ?? "",
        disciplina: (sessao as any).materiais?.disciplinas?.nome ?? "",
      },
      questoes: questoesFmt,
    };
  });

export const responderQuestao = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        sessao_id: z.string().uuid(),
        questao_id: z.string().uuid(),
        alternativa_id: z.string().uuid(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertAcessoAluno(context);
    const { supabase, userId } = context;

    const { data: sessao, error: serr } = await supabase
      .from("questao_sessoes")
      .select("id, material_id, status, total_questoes")
      .eq("id", data.sessao_id)
      .eq("user_id", userId)
      .single();
    if (serr) throw new Error(serr.message);
    if (sessao.status !== "em_andamento") throw new Error("Sessão já finalizada.");

    const { data: existing } = await supabase
      .from("questao_tentativas")
      .select("id")
      .eq("sessao_id", data.sessao_id)
      .eq("questao_id", data.questao_id)
      .maybeSingle();
    if (existing) throw new Error("Questão já respondida nesta tentativa.");

    const { data: alt, error: aerr } = await supabase
      .from("questao_alternativas")
      .select("id, correta, questao_id")
      .eq("id", data.alternativa_id)
      .single();
    if (aerr) throw new Error(aerr.message);
    if (alt.questao_id !== data.questao_id) throw new Error("Alternativa inválida.");

    const acertou = alt.correta === true;

    const { error: terr } = await supabase.from("questao_tentativas").insert({
      user_id: userId,
      sessao_id: data.sessao_id,
      questao_id: data.questao_id,
      alternativa_id: data.alternativa_id,
      acertou,
    });
    if (terr) throw new Error(terr.message);

    // Buscar correta + comentário para retornar
    const [{ data: correta }, { data: questao }] = await Promise.all([
      supabase
        .from("questao_alternativas")
        .select("id, letra")
        .eq("questao_id", data.questao_id)
        .eq("correta", true)
        .single(),
      supabase
        .from("questoes")
        .select("comentario_professor")
        .eq("id", data.questao_id)
        .single(),
    ]);

    // Contar respondidas e possivelmente finalizar
    const { count: respondidas } = await supabase
      .from("questao_tentativas")
      .select("id", { count: "exact", head: true })
      .eq("sessao_id", data.sessao_id);

    let finalizada = false;
    let resumo: { total: number; acertos: number; erros: number; percentual: number } | null = null;

    if ((respondidas ?? 0) >= sessao.total_questoes) {
      const { data: allTent } = await supabase
        .from("questao_tentativas")
        .select("acertou")
        .eq("sessao_id", data.sessao_id);
      const acertos = (allTent ?? []).filter((t: any) => t.acertou).length;
      const erros = (allTent?.length ?? 0) - acertos;
      const percentual = sessao.total_questoes > 0
        ? Math.round((acertos / sessao.total_questoes) * 10000) / 100
        : 0;
      await supabase
        .from("questao_sessoes")
        .update({
          status: "concluida",
          acertos,
          erros,
          percentual,
          concluida_em: new Date().toISOString(),
        })
        .eq("id", data.sessao_id);
      finalizada = true;
      resumo = { total: sessao.total_questoes, acertos, erros, percentual };
    }

    return {
      acertou,
      correta_id: correta?.id ?? null,
      correta_letra: correta?.letra ?? null,
      comentario: questao?.comentario_professor ?? null,
      finalizada,
      resumo,
    };
  });

export const getDesempenhoMaterial = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ material_id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAcessoAluno(context);
    const { supabase, userId } = context;

    const { data: material } = await supabase
      .from("materiais")
      .select("id, titulo, disciplinas(nome)")
      .eq("id", data.material_id)
      .single();

    const { data: sessoes } = await supabase
      .from("questao_sessoes")
      .select("id, status, total_questoes, acertos, erros, percentual, concluida_em, iniciada_em")
      .eq("user_id", userId)
      .eq("material_id", data.material_id)
      .order("concluida_em", { ascending: false, nullsFirst: true });

    const concluidas = (sessoes ?? []).filter((s: any) => s.status === "concluida");
    const ultima = concluidas[0] ?? null;

    let detalhes: any[] = [];
    if (ultima) {
      const { data: tent } = await supabase
        .from("questao_tentativas")
        .select("questao_id, alternativa_id, acertou, questoes(id, enunciado, referencia, comentario_professor, questao_alternativas(id, letra, texto, correta))")
        .eq("sessao_id", ultima.id);
      detalhes = (tent ?? []).map((t: any) => {
        const alts = t.questoes?.questao_alternativas ?? [];
        const escolhida = alts.find((a: any) => a.id === t.alternativa_id);
        const correta = alts.find((a: any) => a.correta);
        return {
          questao_id: t.questao_id,
          enunciado: t.questoes?.enunciado,
          referencia: t.questoes?.referencia,
          comentario: t.questoes?.comentario_professor,
          escolhida: escolhida ? { letra: escolhida.letra, texto: escolhida.texto } : null,
          correta: correta ? { letra: correta.letra, texto: correta.texto } : null,
          acertou: t.acertou,
        };
      });
    }

    return {
      material: {
        id: material?.id,
        titulo: material?.titulo,
        disciplina: (material as any)?.disciplinas?.nome ?? "",
      },
      ultima: ultima
        ? {
            id: ultima.id,
            total: ultima.total_questoes,
            acertos: ultima.acertos,
            erros: ultima.erros,
            percentual: Number(ultima.percentual),
            concluida_em: ultima.concluida_em,
          }
        : null,
      historico: concluidas.map((s: any, i: number) => ({
        tentativa: concluidas.length - i,
        data: s.concluida_em,
        percentual: Number(s.percentual),
      })),
      detalhes,
    };
  });

export const getConteudosParaRevisar = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAcessoAluno(context);
    const { supabase, userId } = context;
    const { data: sessoes } = await supabase
      .from("questao_sessoes")
      .select("material_id, percentual, concluida_em, materiais(id, titulo, disciplinas(nome))")
      .eq("user_id", userId)
      .eq("status", "concluida")
      .order("concluida_em", { ascending: false });

    const seen = new Set<string>();
    const revisar: any[] = [];
    (sessoes ?? []).forEach((s: any) => {
      if (!s.material_id || seen.has(s.material_id)) return;
      seen.add(s.material_id);
      const p = Number(s.percentual);
      if (p < 70) {
        revisar.push({
          material_id: s.material_id,
          titulo: s.materiais?.titulo,
          disciplina: s.materiais?.disciplinas?.nome ?? "",
          percentual: p,
        });
      }
    });
    return revisar;
  });
