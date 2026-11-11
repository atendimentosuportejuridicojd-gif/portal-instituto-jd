import { assertAcessoAluno, getCarreiraUsuario } from "@/lib/acervo.server";
import { contarQuestoesPorMaterial } from "@/lib/questoes-count";
import { normalizarBanca } from "@/lib/banca";
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

export type ModoCronograma = "pos_edital" | "continuada";

export interface ParametrosAluno {
  /** Padrão: pos_edital (com concurso e data da prova). continuada: com trilha, sem prova e sem simulados. */
  modo?: ModoCronograma;
  concurso_id?: string;
  trilha_id?: string;
  data_inicio: string;
  data_prova?: string | null;
  /** Posição 0 = domingo ... 6 = sábado. */
  minutos_por_dia: number[];
  minutos_por_questao: number;
  ordem_disciplinas?: string[];
  usa_simulado: boolean;
  somente_questoes?: boolean;
  duracao_prova_min?: number | null;
  /**
   * Migração da Preparação continuada para o Pós-edital: id do cronograma de origem. As matérias que o aluno já
   * concluiu nele não entram de novo no plano novo.
   */
  materias_concluidas_de?: string;
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
export async function carregarDisciplinas(
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

  // Disciplinas específicas deste concurso vinculadas a uma disciplina do Acervo Base que está na prova: as
  // matérias delas entram na disciplina-base e a específica não vira uma disciplina à parte. Sem vínculo (ou com
  // a base fora da prova), a específica continua sendo uma disciplina própria.
  // Uma disciplina específica pode pertencer a vários concursos (concurso_ids).
  const { data: especificas } = await supabase
    .from("disciplinas")
    .select("id, ordem, disciplina_base_id, concurso_id, concurso_ids")
    .eq("especifica", true);
  const complementos = (especificas ?? [])
    .filter((d: any) => (d.concurso_ids?.length ? d.concurso_ids.includes(concursoId) : d.concurso_id === concursoId))
    .filter((d: any) => d.disciplina_base_id && ids.includes(d.disciplina_base_id))
    .sort((a: any, b: any) => a.ordem - b.ordem);
  const idsComplemento = new Set<string>(complementos.map((d: any) => d.id));
  const estruturaEfetiva = estrutura.filter((e: any) => !idsComplemento.has(e.disciplina_id));
  const idsMaterias = [...new Set([...ids, ...idsComplemento])];

  const { data: concursoInfo } = await supabase.from("concursos").select("banca").eq("id", concursoId).maybeSingle();
  const banca = normalizarBanca(concursoInfo?.banca);
  const [{ data: disciplinas }, { data: materiais }, { data: vinculos }, contagem] = await Promise.all([
    supabase.from("disciplinas").select("id, nome").in("id", ids),
    supabase
      .from("materiais")
      .select("id, titulo, disciplina_id, tempo_leitura, ordem")
      .in("disciplina_id", idsMaterias)
      .eq("publicado", true)
      .eq("tipo", "markdown")
      .order("ordem")
      .order("titulo"),
    supabase.from("concurso_materiais").select("material_id").eq("concurso_id", concursoId),
    contarQuestoesPorMaterial(supabase, { somentePublicadas: true }, banca),
  ]);

  const nomes = new Map<string, string>((disciplinas ?? []).map((d: any) => [d.id, d.nome]));
  const vinculados = new Set<string>((vinculos ?? []).map((v: any) => v.material_id));

  // "Vincular materiais exceção": matérias que, neste concurso, contam numa disciplina da estrutura da prova que
  // não é a delas. Só vale se o destino é uma disciplina que está de fato na prova.
  const idsEfetivos = new Set<string>(estruturaEfetiva.map((e: any) => e.disciplina_id));
  const { data: linhasExcecao } = await (supabase as any)
    .from("concurso_materiais_excecao")
    .select("material_id, disciplina_id")
    .eq("concurso_id", concursoId);
  const excecoes = new Map<string, string>(
    (linhasExcecao ?? [])
      .filter((x: any) => idsEfetivos.has(x.disciplina_id))
      .map((x: any) => [x.material_id, x.disciplina_id]),
  );
  const { data: materiaisExcecao } = excecoes.size
    ? await supabase
        .from("materiais")
        .select("id, titulo, disciplina_id, tempo_leitura, ordem")
        .in("id", [...excecoes.keys()])
        .eq("publicado", true)
        .eq("tipo", "markdown")
        .order("ordem")
        .order("titulo")
    : { data: [] as any[] };

  // Ordem das disciplinas: a escolhida pelo aluno; o que faltar, por peso (maior primeiro) e ordem do admin.
  const padrao = [...estruturaEfetiva].sort((a: any, b: any) => Number(b.peso) - Number(a.peso) || a.ordem - b.ordem);
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
    // Se o concurso tem matérias vinculadas numa disciplina, vale só o vínculo; senão, todas as publicadas.
    const selecionar = (lista: any[]) => {
      const vinc = lista.filter((m: any) => vinculados.has(m.id));
      return vinc.length ? vinc : lista;
    };
    // Matéria com exceção só conta na disciplina de destino; sai da de origem (depois de aplicar a regra do vínculo,
    // para que tirar uma matéria não faça a disciplina de origem "voltar" a incluir todas as publicadas).
    const fica = (m: any) => !excecoes.has(m.id) || excecoes.get(m.id) === e.disciplina_id;
    const proprias = selecionar((materiais ?? []).filter((m: any) => m.disciplina_id === e.disciplina_id)).filter(fica);
    // Complementares vinculadas a esta disciplina vêm depois das matérias do Acervo Base.
    const complementares = complementos
      .filter((c: any) => c.disciplina_base_id === e.disciplina_id)
      .flatMap((c: any) => selecionar((materiais ?? []).filter((m: any) => m.disciplina_id === c.id)))
      .filter(fica);
    // Por último, as matérias de outras disciplinas escolhidas como exceção para esta.
    const jaIncluidas = new Set<string>([...proprias, ...complementares].map((m: any) => m.id));
    const deExcecao = (materiaisExcecao ?? []).filter(
      (m: any) => excecoes.get(m.id) === e.disciplina_id && !jaIncluidas.has(m.id),
    );
    const doConcurso = [...proprias, ...complementares, ...deExcecao];
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
          // Concurso com banca: só as questões reais daquela banca (sem estimativa).
          qtdQuestoes: banca ? (contagem.get(m.id) ?? 0) : contagem.get(m.id) || mediaDisciplina,
          qtdReal: contagem.get(m.id) ?? 0,
        })),
    };
  });
}

async function emLotes<T>(ids: string[], tamanho: number, buscar: (lote: string[]) => Promise<T[]>): Promise<T[]> {
  const todos: T[] = [];
  for (let i = 0; i < ids.length; i += tamanho) todos.push(...(await buscar(ids.slice(i, i + tamanho))));
  return todos;
}

/**
 * Preparação continuada: disciplinas e matérias de uma trilha (só Acervo Base publicado). Não há estrutura de prova;
 * a ordem é a escolhida pelo aluno e, no que faltar, a ordem das disciplinas no Acervo.
 */
export async function carregarDisciplinasTrilha(
  supabase: any,
  trilhaId: string,
  ordemEscolhida: string[] | undefined,
  filtroMateriaConcluida?: Set<string>,
): Promise<DisciplinaCarregada[]> {
  const { data: vinculos, error } = await supabase.from("trilha_materiais").select("material_id").eq("trilha_id", trilhaId);
  if (error) throw new Error(error.message);
  const idsMaterial: string[] = (vinculos ?? []).map((v: any) => v.material_id);
  if (!idsMaterial.length) throw new Error("Esta trilha ainda não tem matérias.");

  const [materiais, contagem] = await Promise.all([
    emLotes<any>(idsMaterial, 100, async (lote) => {
      const { data, error: e } = await supabase
        .from("materiais")
        .select("id, titulo, disciplina_id, tempo_leitura, ordem")
        .in("id", lote)
        .eq("publicado", true)
        .eq("tipo", "markdown");
      if (e) throw new Error(e.message);
      return data ?? [];
    }),
    contarQuestoesPorMaterial(supabase, { somentePublicadas: true }, null),
  ]);
  if (!materiais.length) throw new Error("Esta trilha ainda não tem matérias publicadas.");

  const idsDisciplina = [...new Set<string>(materiais.map((m: any) => m.disciplina_id).filter(Boolean))];
  const { data: disciplinas, error: eDisc } = await supabase
    .from("disciplinas")
    .select("id, nome, ordem")
    .in("id", idsDisciplina);
  if (eDisc) throw new Error(eDisc.message);

  const padrao = [...(disciplinas ?? [])].sort(
    (a: any, b: any) => (a.ordem ?? 0) - (b.ordem ?? 0) || String(a.nome).localeCompare(String(b.nome), "pt-BR"),
  );
  const ordenadas: any[] = [];
  for (const id of ordemEscolhida ?? []) {
    const d = padrao.find((x: any) => x.id === id);
    if (d && !ordenadas.includes(d)) ordenadas.push(d);
  }
  for (const d of padrao) if (!ordenadas.includes(d)) ordenadas.push(d);

  const comQuestoes = [...contagem.values()].filter((n) => n > 0);
  const mediaGlobal = comQuestoes.length
    ? Math.round(comQuestoes.reduce((a, b) => a + b, 0) / comQuestoes.length)
    : QUESTOES_PADRAO;

  return ordenadas.map((d: any) => {
    const doas = materiais
      .filter((m: any) => m.disciplina_id === d.id)
      .sort((a: any, b: any) => (a.ordem ?? 0) - (b.ordem ?? 0) || String(a.titulo).localeCompare(String(b.titulo), "pt-BR"));
    const reais = doas.map((m: any) => contagem.get(m.id) ?? 0).filter((n: number) => n > 0);
    const mediaDisciplina = reais.length
      ? Math.round(reais.reduce((a: number, b: number) => a + b, 0) / reais.length)
      : mediaGlobal;
    return {
      id: d.id,
      nome: d.nome,
      peso: 0,
      qtdProva: 0,
      materias: doas
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

/** Disciplinas de um cronograma, conforme o modo: estrutura da prova do concurso ou matérias da trilha. */
async function carregarDisciplinasDoCronograma(
  supabase: any,
  c: { modo?: string | null; concurso_id?: string | null; trilha_id?: string | null },
  ordem: string[] | undefined,
  filtroMateriaConcluida?: Set<string>,
) {
  if (c.modo === "continuada") {
    if (!c.trilha_id) throw new Error("A trilha deste cronograma não existe mais.");
    return carregarDisciplinasTrilha(supabase, c.trilha_id, ordem, filtroMateriaConcluida);
  }
  if (!c.concurso_id) throw new Error("O concurso deste cronograma não existe mais.");
  return carregarDisciplinas(supabase, c.concurso_id, ordem, filtroMateriaConcluida);
}

function paraMotor(p: ParametrosAluno, disciplinas: DisciplinaCarregada[], dataInicio: string): ParametrosPlano {
  return {
    dataInicio,
    dataProva: p.modo === "continuada" ? null : (p.data_prova ?? null),
    minutosPorDiaSemana: p.minutos_por_dia as ParametrosPlano["minutosPorDiaSemana"],
    disciplinas: disciplinas.filter((d) => d.materias.length > 0),
    minutosPorQuestao: p.minutos_por_questao,
    simulados: p.modo !== "continuada" && p.usa_simulado,
    minutosSimulado: p.modo !== "continuada" && p.usa_simulado ? (p.duracao_prova_min ?? 0) : 0,
    somenteQuestoes: !!p.somente_questoes,
  };
}

function validar(p: ParametrosAluno) {
  const hoje = hojeBrasilia();
  if (p.modo === "continuada") {
    if (!p.trilha_id) throw new Error("Escolha a trilha que você quer estudar.");
    if (p.data_inicio < hoje) throw new Error("A data de início não pode estar no passado.");
    if (p.minutos_por_dia.length !== 7 || p.minutos_por_dia.every((m) => m <= 0)) {
      throw new Error("Informe pelo menos um dia da semana com tempo de estudo.");
    }
    return;
  }
  if (!p.concurso_id) throw new Error("Escolha o concurso.");
  if (!p.data_prova) throw new Error("Informe a data da prova.");
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
  // O administrador usa os simulados quando quiser, sem pagar nem precisar de liberação.
  const { data: ehAdmin } = await supabase.rpc("has_role", { _user_id: userId, _role: "administrador" });
  if (ehAdmin === true) return true;
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

/** Uma matéria conta como estudada quando todos os seus blocos de estudo e questões estão concluídos. */
function materiasConcluidas(blocos: { material_id: string | null; tipo: string; concluido: boolean }[]): Set<string> {
  const porMateria = new Map<string, { total: number; feitos: number }>();
  for (const b of blocos) {
    if (!b.material_id || (b.tipo !== "estudo" && b.tipo !== "questoes")) continue;
    const m = porMateria.get(b.material_id) ?? { total: 0, feitos: 0 };
    m.total++;
    if (b.concluido) m.feitos++;
    porMateria.set(b.material_id, m);
  }
  return new Set<string>([...porMateria.entries()].filter(([, v]) => v.total > 0 && v.feitos === v.total).map(([id]) => id));
}

/** Matérias já concluídas em um cronograma do próprio aluno (para a migração para o Pós-edital). */
async function concluidasDoCronograma(supabase: any, userId: string, cronogramaId: string): Promise<Set<string>> {
  const { data: origem } = await supabase
    .from("cronogramas_aluno")
    .select("id")
    .eq("id", cronogramaId)
    .eq("user_id", userId)
    .maybeSingle();
  if (!origem) throw new Error("Cronograma de origem não encontrado.");
  return materiasConcluidas(await lerBlocos(supabase, cronogramaId, "material_id, tipo, concluido"));
}

// ---------- casos de uso ----------

/** Dados para montar o assistente: concursos com estrutura da prova cadastrada e o acesso aos simulados. */
export async function dadosAssistente(ctx: Ctx) {
  await assertAcessoAluno(ctx);
  const { supabase, userId } = ctx;
  const carreira = await getCarreiraUsuario(ctx);
  const [{ data: concursos }, { data: estruturas }, simuladoLiberado] = await Promise.all([
    supabase
      .from("concursos")
      .select("id, nome, orgao, banca, estado, ano, data_prova")
      .eq("publicado", true)
      .contains("carreiras", [carreira])
      .order("created_at", { ascending: false }),
    supabase.from("concurso_prova_estrutura").select("concurso_id"),
    acessoSimuladoLiberado(supabase, userId),
  ]);
  const comEstrutura = new Set((estruturas ?? []).map((e: any) => e.concurso_id));

  // Preparação continuada: trilhas da carreira com a quantidade de matérias publicadas do Acervo Base.
  const { data: trilhasBrutas } = await (supabase as any)
    .from("trilhas")
    .select("id, nome, descricao, ordem, trilha_pai_id, esferas")
    .contains("carreiras", [carreira])
    .order("ordem");
  const trilhas = await Promise.all(
    (trilhasBrutas ?? []).map(async (t: any) => {
      const { count, error } = await (supabase as any)
        .from("trilha_materiais")
        .select("material_id, materiais!inner(id)", { count: "exact", head: true })
        .eq("trilha_id", t.id)
        .eq("materiais.publicado", true)
        .eq("materiais.tipo", "markdown");
      if (error) throw new Error(error.message);
      return {
        id: t.id as string,
        nome: t.nome as string,
        descricao: (t.descricao as string | null) ?? null,
        trilha_pai_id: (t.trilha_pai_id as string | null) ?? null,
        esferas: ((t.esferas as string[] | null) ?? []) as string[],
        qtdMaterias: (count ?? 0) as number,
      };
    }),
  );
  return {
    hoje: hojeBrasilia(),
    simuladoLiberado,
    concursos: (concursos ?? []).map((c: any) => ({ ...c, pronto: comEstrutura.has(c.id) })),
    trilhas,
  };
}

/** Calcula o plano sem gravar nada, para o aluno conferir antes de criar. */
export async function previaCronograma(ctx: Ctx, p: ParametrosAluno) {
  await assertAcessoAluno(ctx);
  validar(p);
  const excluidas =
    p.modo !== "continuada" && p.materias_concluidas_de
      ? await concluidasDoCronograma(ctx.supabase, ctx.userId, p.materias_concluidas_de)
      : new Set<string>();
  const disciplinas = await carregarDisciplinasDoCronograma(
    ctx.supabase,
    { modo: p.modo, concurso_id: p.concurso_id, trilha_id: p.trilha_id },
    p.ordem_disciplinas,
    excluidas,
  );
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

  const continuada = p.modo === "continuada";
  let nomeAlvo: string;
  if (continuada) {
    const { data: trilha } = await (supabase as any)
      .from("trilhas")
      .select("nome, carreiras")
      .eq("id", p.trilha_id)
      .maybeSingle();
    if (!trilha) throw new Error("Trilha indisponível.");
    nomeAlvo = trilha.nome;
  } else {
    const { data: concurso } = await supabase.from("concursos").select("nome").eq("id", p.concurso_id).maybeSingle();
    if (!concurso) throw new Error("Concurso indisponível.");
    nomeAlvo = concurso.nome;
  }

  const excluidas =
    !continuada && p.materias_concluidas_de
      ? await concluidasDoCronograma(supabase, userId, p.materias_concluidas_de)
      : new Set<string>();
  const disciplinas = await carregarDisciplinasDoCronograma(
    supabase,
    { modo: p.modo, concurso_id: p.concurso_id, trilha_id: p.trilha_id },
    p.ordem_disciplinas,
    excluidas,
  );
  const plano = gerarPlano(paraMotor(p, disciplinas, p.data_inicio));
  const precisaPagar = !continuada && p.usa_simulado && !(await acessoSimuladoLiberado(supabase, userId));
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
      modo: continuada ? "continuada" : "pos_edital",
      concurso_id: continuada ? null : p.concurso_id,
      trilha_id: continuada ? p.trilha_id : null,
      concurso_nome: nomeAlvo,
      data_inicio: p.data_inicio,
      data_prova: continuada ? null : p.data_prova,
      minutos_por_dia: p.minutos_por_dia,
      minutos_por_questao: p.minutos_por_questao,
      usa_simulado: continuada ? false : p.usa_simulado,
      duracao_prova_min: !continuada && p.usa_simulado ? p.duracao_prova_min : null,
      ordem_disciplinas: disciplinas.map((d) => d.id),
      status,
      resumo: { ...resumo(plano), somente_questoes: !!p.somente_questoes, excluir_materias: [...excluidas] },
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
    modo: "pos_edital",
    concurso_id: r.concurso_id,
    data_inicio: dataInicio,
    data_prova: r.data_prova,
    minutos_por_dia: r.minutos_por_dia,
    minutos_por_questao: r.minutos_por_questao,
    ordem_disciplinas: r.ordem_disciplinas,
    usa_simulado: r.usa_simulado,
    duracao_prova_min: r.duracao_prova_min,
    somente_questoes: !!r.resumo?.somente_questoes,
  };
  const excluidasRascunho = new Set<string>(r.resumo?.excluir_materias ?? []);
  const disciplinas = await carregarDisciplinas(supabase, r.concurso_id, r.ordem_disciplinas, excluidasRascunho);
  const plano = gerarPlano(paraMotor(p, disciplinas, dataInicio));

  await supabase.from("cronogramas_aluno").update({ status: "arquivado" }).eq("user_id", userId).eq("status", "ativo");
  const { error } = await supabase
    .from("cronogramas_aluno")
    .update({
      status: "ativo",
      data_inicio: dataInicio,
      resumo: { ...resumo(plano), somente_questoes: !!p.somente_questoes, excluir_materias: [...excluidasRascunho] },
    })
    .eq("id", r.id);
  if (error) throw new Error(error.message);
  await inserirBlocos(supabase, r.id, plano.blocos);
  return { estado: "ativo" as const, id: r.id as string };
}

/** Cronograma ativo (ou rascunho) com os blocos e o andamento. */
export async function cronogramaAtual(ctx: Ctx) {
  await assertAcessoAluno(ctx);
  const { supabase, userId } = ctx;
  const [{ data: brutas }, carreira] = await Promise.all([
    supabase
      .from("cronogramas_aluno")
      .select("*, concursos(carreiras), trilhas(carreiras)")
      .eq("user_id", userId)
      .in("status", ["ativo", "rascunho"]),
    getCarreiraUsuario(ctx),
  ]);
  // Cronogramas only appear in the portal of the career their concurso (ou trilha) belongs to.
  const linhas = (brutas ?? [])
    .filter((c: any) => {
      const carreiras = c.modo === "continuada" ? c.trilhas?.carreiras : c.concursos?.carreiras;
      return !carreiras || carreiras.includes(carreira);
    })
    .map(({ concursos: _c, trilhas: _t, ...c }: any) => c);
  const ativo = linhas.find((c: any) => c.status === "ativo") ?? null;
  const rascunho = linhas.find((c: any) => c.status === "rascunho") ?? null;

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
    diasAteProva: ativo?.data_prova ? diferencaDias(hoje, ativo.data_prova) : null,
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
    .select("modo, concurso_id, trilha_id, ordem_disciplinas, minutos_por_questao")
    .eq("id", bloco.cronograma_id)
    .eq("user_id", userId)
    .maybeSingle();
  if (!c) throw new Error("Cronograma não encontrado.");

  const ordem: string[] = c.ordem_disciplinas ?? [];
  const ate = ordem.indexOf(bloco.disciplina_id);
  const ids = ate >= 0 ? ordem.slice(0, ate + 1) : [bloco.disciplina_id];
  const disciplinas = (await carregarDisciplinasDoCronograma(supabase, c, ordem)).filter((d) => ids.includes(d.id));

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
 * Quando o aluno termina a sessão de questões de uma matéria, os blocos "questões" dessa matéria no cronograma
 * ativo dele passam a concluídos sozinhos. Vale para qualquer origem da sessão (cronograma ou Acervo) e para todos
 * os pedaços do bloco (continuações). Só marca os que ainda estão pendentes, então quem desmarcar depois mantém.
 * Devolve quantos blocos foram marcados.
 */
export async function concluirBlocosDeQuestoes(supabase: any, userId: string, materialId: string): Promise<number> {
  const { data: ativos, error: errAtivos } = await supabase
    .from("cronogramas_aluno")
    .select("id")
    .eq("user_id", userId)
    .eq("status", "ativo");
  if (errAtivos) throw new Error(errAtivos.message);
  const ids = (ativos ?? []).map((c: any) => c.id as string);
  if (ids.length === 0) return 0;

  const { data, error } = await supabase
    .from("cronograma_blocos")
    .update({ concluido: true, concluido_em: new Date().toISOString() })
    .in("cronograma_id", ids)
    .eq("tipo", "questoes")
    .eq("material_id", materialId)
    .eq("concluido", false)
    .select("id");
  if (error) throw new Error(error.message);
  return (data ?? []).length;
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
  if (c.modo !== "continuada" && c.data_prova <= hoje) throw new Error("A data da prova já chegou.");

  const blocos = await lerBlocos(supabase, c.id, "id, tipo, material_id, concluido, data");

  // Além do que o aluno concluiu neste plano, continuam fora as matérias que ele já tinha concluído antes de migrar.
  const excluirBase = new Set<string>(c.resumo?.excluir_materias ?? []);
  const concluidas = new Set<string>([...materiasConcluidas(blocos), ...excluirBase]);

  const p: ParametrosAluno = {
    modo: c.modo === "continuada" ? "continuada" : "pos_edital",
    concurso_id: c.concurso_id ?? undefined,
    trilha_id: c.trilha_id ?? undefined,
    data_inicio: hoje,
    data_prova: c.data_prova,
    minutos_por_dia: c.minutos_por_dia,
    minutos_por_questao: c.minutos_por_questao,
    ordem_disciplinas: c.ordem_disciplinas,
    usa_simulado: c.usa_simulado,
    duracao_prova_min: c.duracao_prova_min,
    somente_questoes: !!c.resumo?.somente_questoes,
  };
  const disciplinas = await carregarDisciplinasDoCronograma(supabase, c, c.ordem_disciplinas, concluidas);
  const plano = gerarPlano(paraMotor(p, disciplinas, hoje));

  // Remove só o que ainda não foi feito (inclui os atrasados); o histórico concluído fica.
  const { error: eDel } = await supabase
    .from("cronograma_blocos")
    .delete()
    .eq("cronograma_id", c.id)
    .eq("concluido", false);
  if (eDel) throw new Error(eDel.message);
  await inserirBlocos(supabase, c.id, plano.blocos);
  const { error } = await supabase
    .from("cronogramas_aluno")
    .update({ resumo: { ...resumo(plano), somente_questoes: !!p.somente_questoes, excluir_materias: [...excluirBase] } })
    .eq("id", c.id);
  if (error) throw new Error(error.message);
  return { resumo: resumo(plano) };
}

/**
 * Exclui de vez o cronograma ativo ou o rascunho do aluno. O banco apaga junto, em cascata, os blocos do plano e os
 * simulados desse cronograma (com respostas e resultados). O histórico de questões e de leitura das matérias fica.
 */
export async function excluirCronograma(ctx: Ctx, status: "ativo" | "rascunho") {
  await assertAcessoAluno(ctx);
  const { data, error } = await ctx.supabase
    .from("cronogramas_aluno")
    .delete()
    .eq("user_id", ctx.userId)
    .eq("status", status)
    .select("id");
  if (error) throw new Error(error.message);
  return { excluidos: (data ?? []).length };
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
