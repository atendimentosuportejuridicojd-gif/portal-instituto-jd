import { assertAcessoAluno } from "@/lib/acervo.server";
import { contarQuestoesPorMaterial } from "@/lib/questoes-count";
import { hojeBrasilia } from "@/lib/simulado-pagamento";
import {
  META_DESEMPENHO,
  diferencaDias,
  gerarPlano,
  type BlocoPlano,
  type DisciplinaPlano,
  type MateriaPlano,
  type ParametrosPlano,
  type ResultadoPlano,
} from "@/lib/cronograma-motor";

type Ctx = { supabase: any; userId: string };

export interface ParametrosAluno {
  concurso_id: string;
  data_inicio: string;
  data_prova: string;
  /** Posição 0 = domingo ... 6 = sábado. */
  minutos_por_dia: number[];
  minutos_por_questao: number;
  ordem_disciplinas?: string[];
  usa_simulado: boolean;
  duracao_prova_min?: number | null;
}

const LEITURA_PADRAO_MIN = 30;
const QUESTOES_PADRAO = 20;

// ---------- dados do concurso ----------

interface MateriaCarregada extends MateriaPlano {
  /** Questões realmente cadastradas na matéria (0 = ainda sem questões). */
  qtdReal: number;
}

interface DisciplinaCarregada extends DisciplinaPlano {
  peso: number;
  qtdProva: number;
  materias: MateriaCarregada[];
}

/** Disciplinas da estrutura da prova do concurso, com as matérias de cada uma e o tempo estimado. */
async function carregarDisciplinas(
  supabase: any,
  concursoId: string,
  ordemEscolhida: string[] | undefined,
  filtroMateriaConcluida?: Set<string>,
): Promise<DisciplinaCarregada[]> {
  const { data: estrutura, error } = await supabase
    .from("concurso_prova_estrutura")
    .select("disciplina_id, qtd_questoes, peso, ordem")
    .eq("concurso_id", concursoId);
  if (error) throw new Error(error.message);
  if (!estrutura?.length) throw new Error("Este concurso ainda não tem a estrutura da prova cadastrada.");

  const ids: string[] = estrutura.map((e: any) => e.disciplina_id);
  const [{ data: disciplinas }, { data: materiais }, { data: vinculos }, contagem] = await Promise.all([
    supabase.from("disciplinas").select("id, nome").in("id", ids),
    supabase
      .from("materiais")
      .select("id, titulo, disciplina_id, tempo_leitura, ordem")
      .in("disciplina_id", ids)
      .eq("publicado", true)
      .eq("tipo", "markdown")
      .order("ordem")
      .order("titulo"),
    supabase.from("concurso_materiais").select("material_id").eq("concurso_id", concursoId),
    contarQuestoesPorMaterial(supabase, { somentePublicadas: true }),
  ]);

  const nomes = new Map<string, string>((disciplinas ?? []).map((d: any) => [d.id, d.nome]));
  const vinculados = new Set<string>((vinculos ?? []).map((v: any) => v.material_id));

  // Ordem das disciplinas: a escolhida pelo aluno; o que faltar, por peso (maior primeiro) e ordem do admin.
  const padrao = [...estrutura].sort((a: any, b: any) => Number(b.peso) - Number(a.peso) || a.ordem - b.ordem);
  const ordenadas: any[] = [];
  for (const id of ordemEscolhida ?? []) {
    const e = padrao.find((x: any) => x.disciplina_id === id);
    if (e && !ordenadas.includes(e)) ordenadas.push(e);
  }
  for (const e of padrao) if (!ordenadas.includes(e)) ordenadas.push(e);

  // Média global de questões por matéria (para matérias que ainda não têm questões cadastradas).
  const comQuestoes = [...contagem.values()].filter((n) => n > 0);
  const mediaGlobal = comQuestoes.length
    ? Math.round(comQuestoes.reduce((a, b) => a + b, 0) / comQuestoes.length)
    : QUESTOES_PADRAO;

  return ordenadas.map((e: any) => {
    const todas = (materiais ?? []).filter((m: any) => m.disciplina_id === e.disciplina_id);
    // Se o concurso tem matérias vinculadas nesta disciplina, vale só o vínculo; senão, todas as publicadas.
    const vinc = todas.filter((m: any) => vinculados.has(m.id));
    const doConcurso = vinc.length ? vinc : todas;
    const reais = doConcurso.map((m: any) => contagem.get(m.id) ?? 0).filter((n: number) => n > 0);
    const mediaDisciplina = reais.length
      ? Math.round(reais.reduce((a: number, b: number) => a + b, 0) / reais.length)
      : mediaGlobal;
    return {
      id: e.disciplina_id,
      nome: nomes.get(e.disciplina_id) ?? "Disciplina",
      peso: Number(e.peso),
      qtdProva: e.qtd_questoes,
      materias: doConcurso
        .filter((m: any) => !filtroMateriaConcluida?.has(m.id))
        .map((m: any) => ({
          id: m.id,
          titulo: m.titulo,
          minutosLeitura: m.tempo_leitura ?? LEITURA_PADRAO_MIN,
          qtdQuestoes: contagem.get(m.id) || mediaDisciplina,
          qtdReal: contagem.get(m.id) ?? 0,
        })),
    };
  });
}

function paraMotor(p: ParametrosAluno, disciplinas: DisciplinaCarregada[], dataInicio: string): ParametrosPlano {
  return {
    dataInicio,
    dataProva: p.data_prova,
    minutosPorDiaSemana: p.minutos_por_dia as ParametrosPlano["minutosPorDiaSemana"],
    disciplinas: disciplinas.filter((d) => d.materias.length > 0),
    minutosPorQuestao: p.minutos_por_questao,
    simulados: p.usa_simulado,
    minutosSimulado: p.usa_simulado ? (p.duracao_prova_min ?? 0) : 0,
  };
}

function validar(p: ParametrosAluno) {
  const hoje = hojeBrasilia();
  if (p.data_prova <= p.data_inicio) throw new Error("A data da prova precisa ser depois da data de início.");
  if (p.data_inicio < hoje) throw new Error("A data de início não pode estar no passado.");
  if (p.data_prova <= hoje) throw new Error("A data da prova precisa estar no futuro.");
  if (p.minutos_por_dia.length !== 7 || p.minutos_por_dia.every((m) => m <= 0)) {
    throw new Error("Informe pelo menos um dia da semana com tempo de estudo.");
  }
  if (p.usa_simulado && !(p.duracao_prova_min && p.duracao_prova_min >= 10)) {
    throw new Error("Informe a duração da prova (em minutos) para incluir os simulados.");
  }
}

function resumo(r: ResultadoPlano) {
  return {
    cabe: r.cabe,
    faltamMinutos: r.faltamMinutos,
    minutosNecessarios: r.minutosNecessarios,
    minutosDisponiveis: r.minutosDisponiveis,
    diasDisponiveis: r.diasDisponiveis,
    fimEstudo: r.fimEstudo,
    diasSobra: r.diasSobra,
    disciplinasForaDoPlano: r.disciplinasForaDoPlano,
    faseFinal: r.faseFinal,
    simulados: r.simulados,
  };
}

// ---------- simulados ----------

export async function acessoSimuladoLiberado(supabase: any, userId: string): Promise<boolean> {
  const { data } = await supabase.from("simulado_acessos").select("ativo, fim").eq("user_id", userId).maybeSingle();
  return data?.ativo === true && (!data.fim || new Date(data.fim).getTime() > Date.now());
}

// ---------- leitura paginada (o banco devolve no máximo 1000 linhas por consulta) ----------

async function lerBlocos(supabase: any, cronogramaId: string, colunas: string): Promise<any[]> {
  const todos: any[] = [];
  for (let de = 0; ; de += 1000) {
    const { data, error } = await supabase
      .from("cronograma_blocos")
      .select(colunas)
      .eq("cronograma_id", cronogramaId)
      .order("data")
      .order("ordem")
      .order("id")
      .range(de, de + 999);
    if (error) throw new Error(error.message);
    todos.push(...(data ?? []));
    if ((data ?? []).length < 1000) break;
  }
  return todos;
}

// ---------- casos de uso ----------

/** Dados para montar o assistente: concursos com estrutura da prova cadastrada e o acesso aos simulados. */
export async function dadosAssistente(ctx: Ctx) {
  await assertAcessoAluno(ctx);
  const { supabase, userId } = ctx;
  const [{ data: concursos }, { data: estruturas }, simuladoLiberado] = await Promise.all([
    supabase
      .from("concursos")
      .select("id, nome, orgao, banca, estado, ano, data_prova")
      .eq("publicado", true)
      .order("created_at", { ascending: false }),
    supabase.from("concurso_prova_estrutura").select("concurso_id"),
    acessoSimuladoLiberado(supabase, userId),
  ]);
  const comEstrutura = new Set((estruturas ?? []).map((e: any) => e.concurso_id));
  return {
    hoje: hojeBrasilia(),
    simuladoLiberado,
    concursos: (concursos ?? []).map((c: any) => ({ ...c, pronto: comEstrutura.has(c.id) })),
  };
}

/** Calcula o plano sem gravar nada, para o aluno conferir antes de criar. */
export async function previaCronograma(ctx: Ctx, p: ParametrosAluno) {
  await assertAcessoAluno(ctx);
  validar(p);
  const disciplinas = await carregarDisciplinas(ctx.supabase, p.concurso_id, p.ordem_disciplinas);
  const plano = gerarPlano(paraMotor(p, disciplinas, p.data_inicio));
  return {
    resumo: resumo(plano),
    disciplinas: disciplinas.map((d) => {
      const blocos = plano.blocos.filter((b) => b.disciplinaId === d.id);
      return {
        id: d.id,
        nome: d.nome,
        materias: d.materias.length,
        minutos: blocos.reduce((a, b) => a + b.minutos, 0),
        inicio: blocos[0]?.data ?? null,
        fim: blocos[blocos.length - 1]?.data ?? null,
        foraDoPlano: plano.disciplinasForaDoPlano.includes(d.id),
      };
    }),
  };
}

async function inserirBlocos(supabase: any, cronogramaId: string, blocos: BlocoPlano[]) {
  const linhas = blocos.map((b) => ({
    cronograma_id: cronogramaId,
    data: b.data,
    ordem: b.ordem,
    tipo: b.tipo,
    disciplina_id: b.disciplinaId,
    material_id: b.materiaId,
    titulo: b.titulo,
    minutos: b.minutos,
    continuacao: b.continuacao,
  }));
  for (let i = 0; i < linhas.length; i += 500) {
    const { error } = await supabase.from("cronograma_blocos").insert(linhas.slice(i, i + 500));
    if (error) throw new Error(error.message);
  }
}

/** Cria o cronograma. Com simulados ainda não pagos, fica como rascunho até a confirmação do pagamento. */
export async function criarCronograma(ctx: Ctx, p: ParametrosAluno) {
  await assertAcessoAluno(ctx);
  validar(p);
  const { supabase, userId } = ctx;

  const { data: concurso } = await supabase.from("concursos").select("nome").eq("id", p.concurso_id).maybeSingle();
  if (!concurso) throw new Error("Concurso indisponível.");

  const disciplinas = await carregarDisciplinas(supabase, p.concurso_id, p.ordem_disciplinas);
  const plano = gerarPlano(paraMotor(p, disciplinas, p.data_inicio));
  const precisaPagar = p.usa_simulado && !(await acessoSimuladoLiberado(supabase, userId));
  const status = precisaPagar ? "rascunho" : "ativo";

  // Só um rascunho por vez: o novo substitui o anterior.
  await supabase.from("cronogramas_aluno").delete().eq("user_id", userId).eq("status", "rascunho");

  const { data: anterior } = await supabase
    .from("cronogramas_aluno")
    .select("id")
    .eq("user_id", userId)
    .eq("status", "ativo")
    .maybeSingle();
  if (status === "ativo" && anterior) {
    const { error } = await supabase.from("cronogramas_aluno").update({ status: "arquivado" }).eq("id", anterior.id);
    if (error) throw new Error(error.message);
  }

  const restaurarAnterior = async () => {
    if (status === "ativo" && anterior) {
      await supabase.from("cronogramas_aluno").update({ status: "ativo" }).eq("id", anterior.id);
    }
  };

  const { data: novo, error } = await supabase
    .from("cronogramas_aluno")
    .insert({
      user_id: userId,
      concurso_id: p.concurso_id,
      concurso_nome: concurso.nome,
      data_inicio: p.data_inicio,
      data_prova: p.data_prova,
      minutos_por_dia: p.minutos_por_dia,
      minutos_por_questao: p.minutos_por_questao,
      usa_simulado: p.usa_simulado,
      duracao_prova_min: p.usa_simulado ? p.duracao_prova_min : null,
      ordem_disciplinas: disciplinas.map((d) => d.id),
      status,
      resumo: resumo(plano),
    })
    .select("id")
    .single();
  if (error) {
    await restaurarAnterior();
    throw new Error(error.message);
  }

  if (status === "ativo") {
    try {
      await inserirBlocos(supabase, novo.id, plano.blocos);
    } catch (e) {
      await supabase.from("cronogramas_aluno").delete().eq("id", novo.id);
      await restaurarAnterior();
      throw e;
    }
  }
  return { id: novo.id as string, status: status as "ativo" | "rascunho", resumo: resumo(plano) };
}

/** Depois do pagamento dos simulados: transforma o rascunho em cronograma ativo. */
export async function finalizarRascunho(ctx: Ctx) {
  await assertAcessoAluno(ctx);
  const { supabase, userId } = ctx;
  const { data: r } = await supabase
    .from("cronogramas_aluno")
    .select("*")
    .eq("user_id", userId)
    .eq("status", "rascunho")
    .maybeSingle();
  if (!r) return { estado: "sem_rascunho" as const };
  if (r.usa_simulado && !(await acessoSimuladoLiberado(supabase, userId))) {
    return { estado: "aguardando_pagamento" as const };
  }

  // Se o aluno demorou para pagar, o plano começa hoje.
  const hoje = hojeBrasilia();
  const dataInicio = r.data_inicio < hoje ? hoje : r.data_inicio;
  if (r.data_prova <= dataInicio) {
    await supabase.from("cronogramas_aluno").delete().eq("id", r.id);
    throw new Error("A data da prova já passou. Monte um novo cronograma.");
  }
  const p: ParametrosAluno = {
    concurso_id: r.concurso_id,
    data_inicio: dataInicio,
    data_prova: r.data_prova,
    minutos_por_dia: r.minutos_por_dia,
    minutos_por_questao: r.minutos_por_questao,
    ordem_disciplinas: r.ordem_disciplinas,
    usa_simulado: r.usa_simulado,
    duracao_prova_min: r.duracao_prova_min,
  };
  const disciplinas = await carregarDisciplinas(supabase, r.concurso_id, r.ordem_disciplinas);
  const plano = gerarPlano(paraMotor(p, disciplinas, dataInicio));

  await supabase.from("cronogramas_aluno").update({ status: "arquivado" }).eq("user_id", userId).eq("status", "ativo");
  const { error } = await supabase
    .from("cronogramas_aluno")
    .update({ status: "ativo", data_inicio: dataInicio, resumo: resumo(plano) })
    .eq("id", r.id);
  if (error) throw new Error(error.message);
  await inserirBlocos(supabase, r.id, plano.blocos);
  return { estado: "ativo" as const, id: r.id as string };
}

/** Cronograma ativo (ou rascunho) com os blocos e o andamento. */
export async function cronogramaAtual(ctx: Ctx) {
  await assertAcessoAluno(ctx);
  const { supabase, userId } = ctx;
  const { data: linhas } = await supabase
    .from("cronogramas_aluno")
    .select("*")
    .eq("user_id", userId)
    .in("status", ["ativo", "rascunho"]);
  const ativo = (linhas ?? []).find((c: any) => c.status === "ativo") ?? null;
  const rascunho = (linhas ?? []).find((c: any) => c.status === "rascunho") ?? null;

  const [simuladoLiberado, blocos] = await Promise.all([
    acessoSimuladoLiberado(supabase, userId),
    ativo
      ? lerBlocos(
          supabase,
          ativo.id,
          "id, data, ordem, tipo, disciplina_id, material_id, titulo, minutos, continuacao, concluido",
        )
      : Promise.resolve([] as any[]),
  ]);
  const idsDisciplina = [...new Set(blocos.map((b: any) => b.disciplina_id).filter(Boolean))] as string[];
  const { data: nomesDisciplinas } = idsDisciplina.length
    ? await supabase.from("disciplinas").select("id, nome").in("id", idsDisciplina)
    : { data: [] as any[] };
  const total = blocos.reduce((a: number, b: any) => a + b.minutos, 0);
  const feito = blocos.filter((b: any) => b.concluido).reduce((a: number, b: any) => a + b.minutos, 0);

  const hoje = hojeBrasilia();
  const atrasados = blocos.filter((b: any) => !b.concluido && b.data < hoje && b.tipo !== "simulado");
  return {
    hoje,
    simuladoLiberado,
    cronograma: ativo,
    rascunho: rascunho ? { id: rascunho.id, concurso_nome: rascunho.concurso_nome } : null,
    blocos,
    disciplinas: (nomesDisciplinas ?? []) as { id: string; nome: string }[],
    progresso: { totalMinutos: total, feitoMinutos: feito, percentual: total ? Math.round((feito / total) * 100) : 0 },
    diasAteProva: ativo ? diferencaDias(hoje, ativo.data_prova) : null,
    diasAtrasados: new Set(atrasados.map((b: any) => b.data)).size,
  };
}

export interface ItemRevisao {
  material_id: string;
  titulo: string;
  disciplina: string;
  /** Percentual da última sessão de questões concluída; null = ainda não resolveu. */
  percentual: number | null;
  acertos: number | null;
  total: number | null;
  qtdQuestoes: number;
  estado: "sem_resolucao" | "abaixo";
}

/**
 * Conteúdo da revisão de uma disciplina, decidido no dia: as matérias abaixo da meta (85%) desta disciplina
 * e das anteriores, medidas pela última sessão de questões concluída de cada uma.
 */
export async function revisaoDoBloco(ctx: Ctx, blocoId: string) {
  await assertAcessoAluno(ctx);
  const { supabase, userId } = ctx;

  const { data: bloco } = await supabase
    .from("cronograma_blocos")
    .select("id, cronograma_id, tipo, disciplina_id, minutos")
    .eq("id", blocoId)
    .maybeSingle();
  if (!bloco || bloco.tipo !== "revisao" || !bloco.disciplina_id) throw new Error("Bloco de revisão não encontrado.");

  const { data: c } = await supabase
    .from("cronogramas_aluno")
    .select("concurso_id, ordem_disciplinas, minutos_por_questao")
    .eq("id", bloco.cronograma_id)
    .eq("user_id", userId)
    .maybeSingle();
  if (!c) throw new Error("Cronograma não encontrado.");
  if (!c.concurso_id) throw new Error("O concurso deste cronograma não existe mais.");

  const ordem: string[] = c.ordem_disciplinas ?? [];
  const ate = ordem.indexOf(bloco.disciplina_id);
  const ids = ate >= 0 ? ordem.slice(0, ate + 1) : [bloco.disciplina_id];
  const disciplinas = (await carregarDisciplinas(supabase, c.concurso_id, ordem)).filter((d) => ids.includes(d.id));

  const materias = disciplinas.flatMap((d) => d.materias.map((m) => ({ ...m, disciplina: d.nome })));
  const comQuestoes = materias.filter((m) => m.qtdReal > 0);
  const idsMateria = comQuestoes.map((m) => m.id);

  const ultima = new Map<string, { percentual: number; acertos: number | null; total: number | null }>();
  if (idsMateria.length) {
    const { data: sessoes, error } = await supabase
      .from("questao_sessoes")
      .select("material_id, percentual, acertos, total_questoes, concluida_em")
      .eq("user_id", userId)
      .eq("status", "concluida")
      .in("material_id", idsMateria)
      .order("concluida_em", { ascending: false })
      .limit(1000);
    if (error) throw new Error(error.message);
    for (const s of sessoes ?? []) {
      if (!ultima.has(s.material_id)) {
        ultima.set(s.material_id, {
          percentual: Number(s.percentual ?? 0),
          acertos: s.acertos ?? null,
          total: s.total_questoes ?? null,
        });
      }
    }
  }

  const itens: ItemRevisao[] = [];
  let aprovadas = 0;
  for (const m of comQuestoes) {
    const u = ultima.get(m.id);
    if (u && u.percentual >= META_DESEMPENHO) {
      aprovadas++;
      continue;
    }
    itens.push({
      material_id: m.id,
      titulo: m.titulo,
      disciplina: m.disciplina,
      percentual: u ? u.percentual : null,
      acertos: u?.acertos ?? null,
      total: u?.total ?? null,
      qtdQuestoes: m.qtdReal,
      estado: u ? "abaixo" : "sem_resolucao",
    });
  }
  // Primeiro o que ainda não foi resolvido, depois as notas mais baixas.
  itens.sort((a, b) => {
    if (a.estado !== b.estado) return a.estado === "sem_resolucao" ? -1 : 1;
    return (a.percentual ?? 0) - (b.percentual ?? 0);
  });

  const nome = disciplinas.find((d) => d.id === bloco.disciplina_id)?.nome ?? "Disciplina";
  return {
    meta: META_DESEMPENHO,
    disciplina: nome,
    itens,
    resumo: {
      paraRevisar: itens.length,
      aprovadas,
      semQuestoes: materias.length - comQuestoes.length,
      minutosEstimados: itens.reduce((acc, i) => acc + i.qtdQuestoes * c.minutos_por_questao, 0),
      minutosReservados: bloco.minutos as number,
    },
  };
}

export async function marcarBloco(ctx: Ctx, id: string, concluido: boolean) {
  const { error } = await ctx.supabase
    .from("cronograma_blocos")
    .update({ concluido, concluido_em: concluido ? new Date().toISOString() : null })
    .eq("id", id);
  if (error) throw new Error(error.message);
  return { ok: true };
}

/**
 * Recalcula a partir de hoje: mantém o que já foi concluído e redistribui o que falta.
 * Uma matéria conta como estudada quando todos os seus blocos de estudo estão concluídos.
 */
export async function recalcularCronograma(ctx: Ctx) {
  await assertAcessoAluno(ctx);
  const { supabase, userId } = ctx;
  const { data: c } = await supabase
    .from("cronogramas_aluno")
    .select("*")
    .eq("user_id", userId)
    .eq("status", "ativo")
    .maybeSingle();
  if (!c) throw new Error("Você não tem um cronograma ativo.");

  const hoje = hojeBrasilia();
  if (c.data_prova <= hoje) throw new Error("A data da prova já chegou.");

  const blocos = await lerBlocos(supabase, c.id, "id, tipo, material_id, concluido, data");

  const porMateria = new Map<string, { total: number; feitos: number }>();
  for (const b of blocos) {
    if (!b.material_id || (b.tipo !== "estudo" && b.tipo !== "questoes")) continue;
    const m = porMateria.get(b.material_id) ?? { total: 0, feitos: 0 };
    m.total++;
    if (b.concluido) m.feitos++;
    porMateria.set(b.material_id, m);
  }
  const concluidas = new Set<string>(
    [...porMateria.entries()].filter(([, v]) => v.total > 0 && v.feitos === v.total).map(([id]) => id),
  );

  const p: ParametrosAluno = {
    concurso_id: c.concurso_id,
    data_inicio: hoje,
    data_prova: c.data_prova,
    minutos_por_dia: c.minutos_por_dia,
    minutos_por_questao: c.minutos_por_questao,
    ordem_disciplinas: c.ordem_disciplinas,
    usa_simulado: c.usa_simulado,
    duracao_prova_min: c.duracao_prova_min,
  };
  const disciplinas = await carregarDisciplinas(supabase, c.concurso_id, c.ordem_disciplinas, concluidas);
  const plano = gerarPlano(paraMotor(p, disciplinas, hoje));

  // Remove só o que ainda não foi feito (inclui os atrasados); o histórico concluído fica.
  const { error: eDel } = await supabase
    .from("cronograma_blocos")
    .delete()
    .eq("cronograma_id", c.id)
    .eq("concluido", false);
  if (eDel) throw new Error(eDel.message);
  await inserirBlocos(supabase, c.id, plano.blocos);
  const { error } = await supabase.from("cronogramas_aluno").update({ resumo: resumo(plano) }).eq("id", c.id);
  if (error) throw new Error(error.message);
  return { resumo: resumo(plano) };
}

export async function arquivarCronograma(ctx: Ctx) {
  const { error } = await ctx.supabase
    .from("cronogramas_aluno")
    .update({ status: "arquivado" })
    .eq("user_id", ctx.userId)
    .in("status", ["ativo", "rascunho"]);
  if (error) throw new Error(error.message);
  return { ok: true };
}
