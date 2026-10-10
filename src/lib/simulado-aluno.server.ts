import { assertAcessoAluno } from "@/lib/acervo.server";
import {
  acessoSimuladoLiberado,
  carregarDisciplinas,
  recalcularCronograma,
} from "@/lib/cronograma-aluno.server";
import { hojeBrasilia } from "@/lib/simulado-pagamento";

/** admin e aleatorio podem ser trocados nos testes; em produção usam a chave de serviço e Math.random. */
type Ctx = { supabase: any; userId: string; admin?: any; aleatorio?: () => number };

const TOLERANCIA_MS = 30_000;

async function adminDb(ctx: Ctx) {
  return ctx.admin ?? (await import("@/integrations/supabase/client.server")).supabaseAdmin;
}

function embaralhar<T>(lista: T[], aleatorio: () => number): T[] {
  const a = [...lista];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(aleatorio() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function pedacos<T>(lista: T[], tamanho: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < lista.length; i += tamanho) out.push(lista.slice(i, i + tamanho));
  return out;
}

async function exigirSimulados(ctx: Ctx) {
  await assertAcessoAluno(ctx);
  if (!(await acessoSimuladoLiberado(ctx.supabase, ctx.userId))) {
    throw new Error("Os simulados não estão liberados para a sua conta.");
  }
}

function expiraEm(s: { iniciado_em: string; duracao_min: number }): number {
  return new Date(s.iniciado_em).getTime() + s.duracao_min * 60_000;
}

// ---------- painel ----------

export type EstadoSimulado = "futuro" | "disponivel" | "atrasado" | "em_andamento" | "concluido";

export async function painelSimulados(ctx: Ctx) {
  await assertAcessoAluno(ctx);
  const { supabase, userId } = ctx;
  const hoje = hojeBrasilia();

  const [liberado, { data: c }] = await Promise.all([
    acessoSimuladoLiberado(supabase, userId),
    supabase
      .from("cronogramas_aluno")
      .select("id, concurso_nome, data_prova, usa_simulado, duracao_prova_min")
      .eq("user_id", userId)
      .eq("status", "ativo")
      .maybeSingle(),
  ]);
  if (!c) return { hoje, liberado, cronograma: null, simulados: [] as any[] };

  const [{ data: blocos }, { data: feitos }] = await Promise.all([
    supabase
      .from("cronograma_blocos")
      .select("id, data")
      .eq("cronograma_id", c.id)
      .eq("tipo", "simulado")
      .order("data"),
    supabase
      .from("simulados_aluno")
      .select("id, bloco_id, numero, status, acertos, total_questoes, percentual, nota_ponderada, por_disciplina, concluido_em")
      .eq("cronograma_id", c.id),
  ]);
  const porBloco = new Map<string, any>((feitos ?? []).map((s: any) => [s.bloco_id, s]));

  const simulados = (blocos ?? []).map((b: any, i: number) => {
    const s = porBloco.get(b.id);
    let estado: EstadoSimulado;
    if (s?.status === "concluido") estado = "concluido";
    else if (s) estado = "em_andamento";
    else if (b.data > hoje) estado = "futuro";
    else if (b.data < hoje) estado = "atrasado";
    else estado = "disponivel";
    return {
      bloco_id: b.id as string,
      numero: i + 1,
      data: b.data as string,
      estado,
      simulado_id: (s?.id as string | undefined) ?? null,
      acertos: s?.acertos ?? null,
      total: s?.total_questoes ?? null,
      percentual: s?.percentual != null ? Number(s.percentual) : null,
      nota_ponderada: s?.nota_ponderada != null ? Number(s.nota_ponderada) : null,
      por_disciplina: s?.por_disciplina ?? null,
    };
  });
  return { hoje, liberado, cronograma: c, simulados };
}

// ---------- montar e iniciar ----------

/** IDs das questões publicadas e não anuladas, agrupados por matéria. */
async function questoesPorMateria(supabase: any, materialIds: string[]): Promise<Map<string, string[]>> {
  const mapa = new Map<string, string[]>();
  for (const grupo of pedacos(materialIds, 60)) {
    for (let de = 0; ; de += 1000) {
      const { data, error } = await supabase
        .from("questoes")
        .select("id, material_id")
        .in("material_id", grupo)
        .eq("publicado", true)
        .eq("anulada", false)
        .order("id")
        .range(de, de + 999);
      if (error) throw new Error(error.message);
      for (const q of data ?? []) {
        const l = mapa.get(q.material_id) ?? [];
        l.push(q.id);
        mapa.set(q.material_id, l);
      }
      if ((data ?? []).length < 1000) break;
    }
  }
  return mapa;
}

export async function iniciarSimulado(ctx: Ctx, blocoId: string) {
  await exigirSimulados(ctx);
  const { supabase, userId } = ctx;
  const db = await adminDb(ctx);
  const aleatorio = ctx.aleatorio ?? Math.random;

  const { data: bloco } = await supabase
    .from("cronograma_blocos")
    .select("id, cronograma_id, tipo, data")
    .eq("id", blocoId)
    .maybeSingle();
  if (!bloco || bloco.tipo !== "simulado") throw new Error("Simulado não encontrado no seu cronograma.");

  const { data: c } = await supabase
    .from("cronogramas_aluno")
    .select("id, concurso_id, status, duracao_prova_min")
    .eq("id", bloco.cronograma_id)
    .eq("user_id", userId)
    .maybeSingle();
  if (!c || c.status !== "ativo") throw new Error("Simulado não encontrado no seu cronograma.");
  if (!c.concurso_id) throw new Error("O concurso deste cronograma não existe mais.");
  if (bloco.data > hojeBrasilia()) throw new Error("Este simulado só abre na data prevista no seu cronograma.");
  if (!c.duracao_prova_min) throw new Error("Informe a duração da prova para liberar os simulados.");

  // Já iniciado? Retoma (ou mostra o resultado, se concluído).
  const { data: existente } = await supabase
    .from("simulados_aluno")
    .select("id, status")
    .eq("bloco_id", bloco.id)
    .eq("user_id", userId)
    .maybeSingle();
  if (existente) return { simulado_id: existente.id as string, retomado: true };

  const { data: estrutura } = await supabase
    .from("concurso_prova_estrutura")
    .select("disciplina_id, qtd_questoes, peso, ordem")
    .eq("concurso_id", c.concurso_id)
    .order("ordem");
  if (!estrutura?.length) throw new Error("Este concurso ainda não tem a estrutura da prova cadastrada.");

  const disciplinas = await carregarDisciplinas(supabase, c.concurso_id, undefined);
  const materiasDe = new Map<string, string[]>(disciplinas.map((d) => [d.id, d.materias.map((m) => m.id)]));
  const todasMaterias = [...new Set([...materiasDe.values()].flat())];
  const porMateria = await questoesPorMateria(supabase, todasMaterias);

  // Questões que o aluno já viu em simulados anteriores deste cronograma: só repetem se faltar opção.
  const { data: anteriores } = await supabase.from("simulados_aluno").select("id").eq("cronograma_id", c.id);
  const usadas = new Set<string>();
  const idsAnteriores = (anteriores ?? []).map((s: any) => s.id);
  for (const grupo of pedacos(idsAnteriores, 50)) {
    const { data } = await supabase.from("simulado_questoes").select("questao_id").in("simulado_id", grupo);
    for (const r of data ?? []) usadas.add(r.questao_id);
  }

  const escolhidas: { questao_id: string; disciplina_id: string; ordem: number }[] = [];
  const faltaram: Record<string, number> = {};
  for (const e of estrutura) {
    const candidatas = (materiasDe.get(e.disciplina_id) ?? []).flatMap((m) => porMateria.get(m) ?? []);
    const novas = embaralhar(candidatas.filter((q) => !usadas.has(q)), aleatorio);
    const repetidas = embaralhar(candidatas.filter((q) => usadas.has(q)), aleatorio);
    const sorteio = [...novas, ...repetidas].slice(0, e.qtd_questoes);
    if (sorteio.length < e.qtd_questoes) faltaram[e.disciplina_id] = e.qtd_questoes - sorteio.length;
    for (const q of sorteio) escolhidas.push({ questao_id: q, disciplina_id: e.disciplina_id, ordem: escolhidas.length });
  }
  if (escolhidas.length === 0) {
    throw new Error("Ainda não há questões cadastradas nas disciplinas desta prova para montar o simulado.");
  }

  const { data: todosBlocos } = await supabase
    .from("cronograma_blocos")
    .select("id, data")
    .eq("cronograma_id", c.id)
    .eq("tipo", "simulado")
    .order("data");
  const numero = Math.max(1, (todosBlocos ?? []).findIndex((b: any) => b.id === bloco.id) + 1);

  const { data: criado, error } = await db
    .from("simulados_aluno")
    .insert({
      user_id: userId,
      cronograma_id: c.id,
      bloco_id: bloco.id,
      numero,
      duracao_min: c.duracao_prova_min,
      total_questoes: escolhidas.length,
      por_disciplina: Object.keys(faltaram).length ? { faltaram } : null,
    })
    .select("id")
    .single();
  if (error) {
    // Dois cliques ao mesmo tempo: o índice único do bloco barra o segundo; devolve o que já existe.
    const { data: outro } = await supabase.from("simulados_aluno").select("id").eq("bloco_id", bloco.id).maybeSingle();
    if (outro) return { simulado_id: outro.id as string, retomado: true };
    throw new Error(error.message);
  }
  const { error: eQ } = await db
    .from("simulado_questoes")
    .insert(escolhidas.map((q) => ({ simulado_id: criado.id, ...q })));
  if (eQ) {
    await db.from("simulados_aluno").delete().eq("id", criado.id);
    throw new Error(eQ.message);
  }
  return { simulado_id: criado.id as string, retomado: false, faltaram };
}

// ---------- fazer a prova ----------

async function carregarSimulado(ctx: Ctx, id: string) {
  const { data: s } = await ctx.supabase
    .from("simulados_aluno")
    .select("*")
    .eq("id", id)
    .eq("user_id", ctx.userId)
    .maybeSingle();
  if (!s) throw new Error("Simulado não encontrado.");
  return s;
}

/** Prova em andamento (sem gabarito nem comentário) ou, se já terminou, o resultado. */
export async function lerSimulado(ctx: Ctx, id: string) {
  await exigirSimulados(ctx);
  let s = await carregarSimulado(ctx, id);

  // Passou do tempo: encerra com o que foi respondido.
  if (s.status === "em_andamento" && Date.now() > expiraEm(s) + TOLERANCIA_MS) {
    await finalizarSimulado(ctx, id);
    s = await carregarSimulado(ctx, id);
  }
  if (s.status === "concluido") return { status: "concluido" as const, resultado: resultadoDe(s) };

  const { supabase } = ctx;
  const { data: sq } = await supabase
    .from("simulado_questoes")
    .select("questao_id, disciplina_id, ordem, alternativa_id")
    .eq("simulado_id", id)
    .order("ordem");
  const ids = (sq ?? []).map((r: any) => r.questao_id);
  const questoes = new Map<string, any>();
  for (const grupo of pedacos(ids, 50)) {
    const { data, error } = await supabase
      .from("questoes")
      .select("id, enunciado, referencia, questao_alternativas(id, letra, texto)")
      .in("id", grupo);
    if (error) throw new Error(error.message);
    for (const q of data ?? []) questoes.set(q.id, q);
  }
  const idsDisc = [...new Set((sq ?? []).map((r: any) => r.disciplina_id).filter(Boolean))] as string[];
  const { data: discs } = idsDisc.length
    ? await supabase.from("disciplinas").select("id, nome").in("id", idsDisc)
    : { data: [] as any[] };
  const nomes = new Map<string, string>((discs ?? []).map((d: any) => [d.id, d.nome]));

  return {
    status: "em_andamento" as const,
    duracao_min: s.duracao_min as number,
    expira_em: new Date(expiraEm(s)).toISOString(),
    agora: new Date().toISOString(),
    numero: s.numero as number,
    questoes: (sq ?? [])
      .filter((r: any) => questoes.has(r.questao_id))
      .map((r: any) => {
        const q = questoes.get(r.questao_id);
        return {
          id: q.id as string,
          ordem: r.ordem as number,
          disciplina: nomes.get(r.disciplina_id) ?? "",
          enunciado: q.enunciado as string,
          referencia: (q.referencia as string | null) ?? null,
          // Apenas id, letra e texto: nunca a alternativa correta.
          alternativas: [...(q.questao_alternativas ?? [])]
            .sort((a: any, b: any) => String(a.letra).localeCompare(String(b.letra)))
            .map((a: any) => ({ id: a.id as string, letra: a.letra as string, texto: a.texto as string })),
          marcada: (r.alternativa_id as string | null) ?? null,
        };
      }),
  };
}

export async function responderSimulado(
  ctx: Ctx,
  d: { simulado_id: string; questao_id: string; alternativa_id: string | null },
) {
  await exigirSimulados(ctx);
  const s = await carregarSimulado(ctx, d.simulado_id);
  if (s.status !== "em_andamento") throw new Error("Este simulado já foi finalizado.");
  if (Date.now() > expiraEm(s) + TOLERANCIA_MS) throw new Error("O tempo do simulado acabou.");

  const { data: sq } = await ctx.supabase
    .from("simulado_questoes")
    .select("questao_id")
    .eq("simulado_id", d.simulado_id)
    .eq("questao_id", d.questao_id)
    .maybeSingle();
  if (!sq) throw new Error("Questão não pertence a este simulado.");

  if (d.alternativa_id) {
    const { data: alt } = await ctx.supabase
      .from("questao_alternativas")
      .select("id, questao_id")
      .eq("id", d.alternativa_id)
      .maybeSingle();
    if (!alt || alt.questao_id !== d.questao_id) throw new Error("Alternativa inválida.");
  }

  const db = await adminDb(ctx);
  const { error } = await db
    .from("simulado_questoes")
    .update({ alternativa_id: d.alternativa_id, respondida_em: d.alternativa_id ? new Date().toISOString() : null })
    .eq("simulado_id", d.simulado_id)
    .eq("questao_id", d.questao_id);
  if (error) throw new Error(error.message);
  return { ok: true };
}

function resultadoDe(s: any) {
  return {
    numero: s.numero as number,
    acertos: s.acertos as number,
    total: s.total_questoes as number,
    percentual: Number(s.percentual ?? 0),
    nota_ponderada: Number(s.nota_ponderada ?? 0),
    por_disciplina: ((s.por_disciplina?.itens ?? []) as any[]).map((i) => ({ ...i })),
    faltaram: (s.por_disciplina?.faltaram ?? {}) as Record<string, number>,
    concluido_em: (s.concluido_em as string | null) ?? null,
  };
}

/** Corrige a prova. Questão sem resposta conta como errada. Mostra só o desempenho, sem gabarito. */
export async function finalizarSimulado(ctx: Ctx, id: string) {
  await exigirSimulados(ctx);
  const s = await carregarSimulado(ctx, id);
  if (s.status === "concluido") return resultadoDe(s);

  const db = await adminDb(ctx);
  const { data: sq } = await db
    .from("simulado_questoes")
    .select("questao_id, disciplina_id, ordem, alternativa_id")
    .eq("simulado_id", id);
  const linhas: any[] = sq ?? [];

  const corretas = new Map<string, string>();
  for (const grupo of pedacos(linhas.map((l) => l.questao_id), 50)) {
    const { data } = await db.from("questao_alternativas").select("id, questao_id").in("questao_id", grupo).eq("correta", true);
    for (const a of data ?? []) corretas.set(a.questao_id, a.id);
  }

  const corrigidas = linhas.map((l) => ({ ...l, acertou: !!l.alternativa_id && corretas.get(l.questao_id) === l.alternativa_id }));
  const acertos = corrigidas.filter((l) => l.acertou).length;
  const total = corrigidas.length;

  const { data: c } = await ctx.supabase.from("cronogramas_aluno").select("concurso_id").eq("id", s.cronograma_id).maybeSingle();
  const { data: estrutura } = c?.concurso_id
    ? await ctx.supabase.from("concurso_prova_estrutura").select("disciplina_id, qtd_questoes, peso").eq("concurso_id", c.concurso_id)
    : { data: [] as any[] };
  const idsDisc = [...new Set(corrigidas.map((l) => l.disciplina_id).filter(Boolean))] as string[];
  const { data: discs } = idsDisc.length
    ? await ctx.supabase.from("disciplinas").select("id, nome").in("id", idsDisc)
    : { data: [] as any[] };
  const nomes = new Map<string, string>((discs ?? []).map((d: any) => [d.id, d.nome]));
  const pesos = new Map<string, { peso: number; pedidas: number }>(
    (estrutura ?? []).map((e: any) => [e.disciplina_id, { peso: Number(e.peso), pedidas: e.qtd_questoes }]),
  );

  const itens = idsDisc.map((did) => {
    const doDisc = corrigidas.filter((l) => l.disciplina_id === did);
    const ac = doDisc.filter((l) => l.acertou).length;
    return {
      disciplina_id: did,
      nome: nomes.get(did) ?? "Disciplina",
      peso: pesos.get(did)?.peso ?? 1,
      pedidas: pesos.get(did)?.pedidas ?? doDisc.length,
      total: doDisc.length,
      acertos: ac,
      percentual: doDisc.length ? Math.round((ac / doDisc.length) * 10000) / 100 : 0,
    };
  });
  const somaPesos = itens.reduce((a, i) => a + i.peso, 0);
  const notaPonderada = somaPesos
    ? Math.round((itens.reduce((a, i) => a + i.peso * i.percentual, 0) / somaPesos) * 100) / 100
    : 0;
  const percentual = total ? Math.round((acertos / total) * 10000) / 100 : 0;

  const { error: eQ } = await db
    .from("simulado_questoes")
    .upsert(corrigidas.map((l) => ({ simulado_id: id, ...l })), { onConflict: "simulado_id,questao_id" });
  if (eQ) throw new Error(eQ.message);

  const faltaram = s.por_disciplina?.faltaram ?? {};
  const concluidoEm = new Date().toISOString();
  const { error } = await db
    .from("simulados_aluno")
    .update({
      status: "concluido",
      concluido_em: concluidoEm,
      acertos,
      percentual,
      nota_ponderada: notaPonderada,
      por_disciplina: { itens, faltaram },
    })
    .eq("id", id);
  if (error) throw new Error(error.message);

  if (s.bloco_id) {
    await db.from("cronograma_blocos").update({ concluido: true, concluido_em: concluidoEm }).eq("id", s.bloco_id);
  }
  return resultadoDe({
    ...s, status: "concluido", concluido_em: concluidoEm, acertos, total_questoes: total, percentual,
    nota_ponderada: notaPonderada, por_disciplina: { itens, faltaram },
  });
}

// ---------- contratar / ativar dentro do cronograma ----------

/**
 * Inclui os simulados no cronograma ativo. Sem acesso liberado, só guarda a duração da prova e avisa que
 * falta o pagamento; depois de pago, a página do cronograma chama de novo (sem parâmetros) e o plano é refeito.
 */
export async function ativarSimulados(ctx: Ctx, duracaoProvaMin?: number) {
  await assertAcessoAluno(ctx);
  const { supabase, userId } = ctx;
  const { data: c } = await supabase
    .from("cronogramas_aluno")
    .select("id, data_prova, usa_simulado, duracao_prova_min")
    .eq("user_id", userId)
    .eq("status", "ativo")
    .maybeSingle();
  if (!c) throw new Error("Monte um cronograma antes de incluir os simulados.");

  const duracao = duracaoProvaMin ?? c.duracao_prova_min;
  if (!duracao || duracao < 10) throw new Error("Informe a duração da prova do edital.");
  if (duracaoProvaMin && duracaoProvaMin !== c.duracao_prova_min) {
    const { error } = await supabase.from("cronogramas_aluno").update({ duracao_prova_min: duracaoProvaMin }).eq("id", c.id);
    if (error) throw new Error(error.message);
  }

  if (!(await acessoSimuladoLiberado(supabase, userId))) {
    return { estado: "aguardando_pagamento" as const, data_prova: c.data_prova as string };
  }
  if (!c.usa_simulado) {
    const { error } = await supabase.from("cronogramas_aluno").update({ usa_simulado: true }).eq("id", c.id);
    if (error) throw new Error(error.message);
    await recalcularCronograma(ctx);
  }
  return { estado: "ativo" as const, data_prova: c.data_prova as string };
}
