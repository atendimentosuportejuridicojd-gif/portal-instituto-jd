import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/acervo.server", () => ({ assertAcessoAluno: async () => undefined }));
vi.mock("@/lib/questoes-count", () => ({ contarQuestoesPorMaterial: async () => new Map() }));

import { finalizarSimulado, iniciarSimulado, lerSimulado, responderSimulado } from "@/lib/simulado-aluno.server";

/** Banco em memória com o mínimo de Supabase usado pelo servidor (select/insert/update/upsert/delete). */
function criarBanco(tabelas: Record<string, any[]>) {
  let seq = 0;
  return {
    tabelas,
    from(nome: string) {
      const linhas = (tabelas[nome] ??= []);
      const filtros: ((r: any) => boolean)[] = [];
      let modo: "select" | "insert" | "update" | "upsert" | "delete" = "select";
      let carga: any;
      let opcoes: any;
      let unico: "single" | "maybe" | null = null;
      const alvo = () => linhas.filter((r) => filtros.every((f) => f(r)));
      const executar = () => {
        let data: any;
        if (modo === "insert") {
          const padroes: Record<string, any> =
            nome === "simulados_aluno" ? { status: "em_andamento", iniciado_em: new Date().toISOString() } : {};
          const novas = (Array.isArray(carga) ? carga : [carga]).map((r) => ({ id: `${nome}-${++seq}`, ...padroes, ...r }));
          linhas.push(...novas);
          data = novas;
        } else if (modo === "update") {
          data = alvo();
          data.forEach((r: any) => Object.assign(r, carga));
        } else if (modo === "delete") {
          data = alvo();
          data.forEach((r: any) => linhas.splice(linhas.indexOf(r), 1));
        } else if (modo === "upsert") {
          const chaves = String(opcoes.onConflict).split(",");
          for (const nova of carga) {
            const ex = linhas.find((r) => chaves.every((k) => r[k] === nova[k]));
            if (ex) Object.assign(ex, nova);
            else linhas.push({ id: `${nome}-${++seq}`, ...nova });
          }
          data = carga;
        } else data = alvo();
        if (unico) {
          if (!data[0] && unico === "single") return { data: null, error: { message: "não encontrado" } };
          return { data: data[0] ?? null, error: null };
        }
        return { data, error: null };
      };
      const b: any = {
        select: () => b,
        order: () => b,
        range: () => b,
        limit: () => b,
        eq: (c: string, v: unknown) => (filtros.push((r) => r[c] === v), b),
        in: (c: string, vs: unknown[]) => (filtros.push((r) => vs.includes(r[c])), b),
        insert: (p: any) => ((modo = "insert"), (carga = p), b),
        update: (p: any) => ((modo = "update"), (carga = p), b),
        upsert: (p: any, o: any) => ((modo = "upsert"), (carga = p), (opcoes = o), b),
        delete: () => ((modo = "delete"), b),
        single: () => ((unico = "single"), b),
        maybeSingle: () => ((unico = "maybe"), b),
        then: (res: any, rej: any) => Promise.resolve(executar()).then(res, rej),
      };
      return b;
    },
  };
}

const alts = (q: string) => [
  { id: `${q}-a`, questao_id: q, letra: "A", texto: "Certa", correta: true },
  { id: `${q}-b`, questao_id: q, letra: "B", texto: "Errada", correta: false },
];
const questao = (id: string, material_id: string) => ({
  id, material_id, publicado: true, anulada: false, enunciado: `Enunciado ${id}`, referencia: null,
  comentario_professor: "COMENTARIO SECRETO", questao_alternativas: alts(id),
});

function cenario() {
  const t: Record<string, any[]> = {
    simulado_acessos: [{ user_id: "u1", ativo: true, fim: null }],
    cronogramas_aluno: [{ id: "cr1", user_id: "u1", concurso_id: "c1", status: "ativo", duracao_prova_min: 120 }],
    cronograma_blocos: [
      { id: "b1", cronograma_id: "cr1", tipo: "simulado", data: "2020-01-01", concluido: false },
      { id: "b2", cronograma_id: "cr1", tipo: "simulado", data: "2020-01-16", concluido: false },
    ],
    concurso_prova_estrutura: [
      { concurso_id: "c1", disciplina_id: "d1", qtd_questoes: 3, peso: 2, ordem: 0 },
      { concurso_id: "c1", disciplina_id: "d2", qtd_questoes: 4, peso: 1, ordem: 1 },
    ],
    disciplinas: [{ id: "d1", nome: "Português" }, { id: "d2", nome: "Constitucional" }],
    materiais: [
      { id: "m1", titulo: "Crase", disciplina_id: "d1", tempo_leitura: 30, ordem: 1, publicado: true, tipo: "markdown" },
      { id: "m2", titulo: "Vírgula", disciplina_id: "d1", tempo_leitura: 30, ordem: 2, publicado: true, tipo: "markdown" },
      { id: "m3", titulo: "Direitos", disciplina_id: "d2", tempo_leitura: 30, ordem: 1, publicado: true, tipo: "markdown" },
    ],
    concurso_materiais: [],
    // d1 tem 5 questões (pede 3); d2 tem só 2 (pede 4 → faltam 2).
    questoes: [
      questao("q1", "m1"), questao("q2", "m1"), questao("q3", "m1"), questao("q4", "m2"), questao("q5", "m2"),
      questao("q6", "m3"), questao("q7", "m3"),
    ],
    questao_alternativas: ["q1", "q2", "q3", "q4", "q5", "q6", "q7"].flatMap(alts),
    simulados_aluno: [],
    simulado_aluno_questoes: [],
  };
  const db = criarBanco(t);
  return { t, db, ctx: { supabase: db, admin: db, userId: "u1", aleatorio: () => 0.3 } };
}

describe("simulados do cronograma", () => {
  let c: ReturnType<typeof cenario>;
  beforeEach(() => {
    c = cenario();
  });

  it("monta a prova pela estrutura (qtd por disciplina), registra o que faltou e retoma se já iniciado", async () => {
    const r = await iniciarSimulado(c.ctx, "b1");
    expect(r.retomado).toBe(false);
    const qs = c.t.simulado_aluno_questoes;
    expect(qs.filter((q) => q.disciplina_id === "d1")).toHaveLength(3);
    expect(qs.filter((q) => q.disciplina_id === "d2")).toHaveLength(2);
    expect(c.t.simulados_aluno[0]).toMatchObject({ numero: 1, duracao_min: 120, total_questoes: 5 });
    expect(c.t.simulados_aluno[0].por_disciplina.faltaram).toEqual({ d2: 2 });

    const de_novo = await iniciarSimulado(c.ctx, "b1");
    expect(de_novo).toMatchObject({ simulado_id: r.simulado_id, retomado: true });
    expect(c.t.simulados_aluno).toHaveLength(1);
  });

  it("a prova em andamento nunca expõe gabarito nem comentário", async () => {
    const { simulado_id } = await iniciarSimulado(c.ctx, "b1");
    const prova = await lerSimulado(c.ctx, simulado_id);
    expect(prova.status).toBe("em_andamento");
    const texto = JSON.stringify(prova);
    expect(texto).not.toContain("correta");
    expect(texto).not.toContain("COMENTARIO SECRETO");
    expect(texto).not.toContain("comentario");
    if (prova.status === "em_andamento") {
      expect(prova.questoes).toHaveLength(5);
      expect(prova.questoes[0].alternativas.every((a: any) => Object.keys(a).sort().join() === "id,letra,texto")).toBe(true);
    }
  });

  it("corrige com nota ponderada pelo peso, conta sem resposta como erro e marca o bloco como feito", async () => {
    const { simulado_id } = await iniciarSimulado(c.ctx, "b1");
    const todas = c.t.simulado_aluno_questoes;
    // d1: acerta as 3. d2: acerta 1 e deixa 1 em branco.
    for (const q of todas.filter((x) => x.disciplina_id === "d1")) {
      await responderSimulado(c.ctx, { simulado_id, questao_id: q.questao_id, alternativa_id: `${q.questao_id}-a` });
    }
    const d2 = todas.filter((x) => x.disciplina_id === "d2");
    await responderSimulado(c.ctx, { simulado_id, questao_id: d2[0].questao_id, alternativa_id: `${d2[0].questao_id}-a` });

    const r = await finalizarSimulado(c.ctx, simulado_id);
    expect(r).toMatchObject({ acertos: 4, total: 5, percentual: 80 });
    const d1r = r.por_disciplina.find((i: any) => i.disciplina_id === "d1");
    const d2r = r.por_disciplina.find((i: any) => i.disciplina_id === "d2");
    expect(d1r).toMatchObject({ acertos: 3, total: 3, percentual: 100, peso: 2, pedidas: 3 });
    expect(d2r).toMatchObject({ acertos: 1, total: 2, percentual: 50, peso: 1, pedidas: 4 });
    expect(r.nota_ponderada).toBeCloseTo((2 * 100 + 1 * 50) / 3, 2);
    expect(r.faltaram).toEqual({ d2: 2 });
    expect(c.t.cronograma_blocos.find((b) => b.id === "b1")?.concluido).toBe(true);

    // O resultado não traz gabarito nem comentário, e finalizar de novo é inofensivo.
    expect(JSON.stringify(r)).not.toContain("COMENTARIO");
    expect((await finalizarSimulado(c.ctx, simulado_id)).acertos).toBe(4);
    expect((await lerSimulado(c.ctx, simulado_id)).status).toBe("concluido");
  });

  it("recusa resposta depois de finalizado, alternativa de outra questão e questão fora do simulado", async () => {
    const { simulado_id } = await iniciarSimulado(c.ctx, "b1");
    const [q] = c.t.simulado_aluno_questoes;
    const fora = c.t.questoes.find((x) => !c.t.simulado_aluno_questoes.some((s) => s.questao_id === x.id))!;
    await expect(
      responderSimulado(c.ctx, { simulado_id, questao_id: q.questao_id, alternativa_id: "q7-a" }),
    ).rejects.toThrow("Alternativa inválida");
    await expect(
      responderSimulado(c.ctx, { simulado_id, questao_id: fora.id, alternativa_id: `${fora.id}-a` }),
    ).rejects.toThrow("não pertence");
    await finalizarSimulado(c.ctx, simulado_id);
    await expect(
      responderSimulado(c.ctx, { simulado_id, questao_id: q.questao_id, alternativa_id: `${q.questao_id}-a` }),
    ).rejects.toThrow("já foi finalizado");
  });

  it("tempo esgotado: ao abrir, encerra com o que foi respondido", async () => {
    const { simulado_id } = await iniciarSimulado(c.ctx, "b1");
    const q = c.t.simulado_aluno_questoes.find((x) => x.disciplina_id === "d1")!;
    await responderSimulado(c.ctx, { simulado_id, questao_id: q.questao_id, alternativa_id: `${q.questao_id}-a` });
    c.t.simulados_aluno[0].iniciado_em = new Date(Date.now() - 3 * 3600_000).toISOString(); // 3 h atrás, prova de 2 h
    const r: any = await lerSimulado(c.ctx, simulado_id);
    expect(r.status).toBe("concluido");
    expect(r.resultado.acertos).toBe(1);
    await expect(
      responderSimulado(c.ctx, { simulado_id, questao_id: q.questao_id, alternativa_id: `${q.questao_id}-b` }),
    ).rejects.toThrow("já foi finalizado");
  });

  it("o segundo simulado prefere questões que o aluno ainda não viu", async () => {
    await iniciarSimulado(c.ctx, "b1");
    const vistas = new Set(c.t.simulado_aluno_questoes.filter((q) => q.disciplina_id === "d1").map((q) => q.questao_id));
    expect(vistas.size).toBe(3);
    await iniciarSimulado(c.ctx, "b2");
    const segundo = c.t.simulado_aluno_questoes.filter((q) => q.simulado_id === c.t.simulados_aluno[1].id && q.disciplina_id === "d1");
    const inéditas = segundo.filter((q) => !vistas.has(q.questao_id)).length;
    expect(segundo).toHaveLength(3);
    expect(inéditas).toBe(2); // só existiam 2 inéditas em d1; a 3ª repete
    expect(c.t.simulados_aluno[1].numero).toBe(2);
  });

  it("exige acesso liberado e respeita a data prevista", async () => {
    c.t.simulado_acessos[0].ativo = false;
    await expect(iniciarSimulado(c.ctx, "b1")).rejects.toThrow("não estão liberados");
    c.t.simulado_acessos[0].ativo = true;
    c.t.cronograma_blocos[0].data = "2999-01-01";
    await expect(iniciarSimulado(c.ctx, "b1")).rejects.toThrow("só abre na data prevista");
  });

  it("não mexe no simulado de outro aluno", async () => {
    const { simulado_id } = await iniciarSimulado(c.ctx, "b1");
    c.t.simulado_acessos.push({ user_id: "u2", ativo: true, fim: null });
    await expect(lerSimulado({ ...c.ctx, userId: "u2" }, simulado_id)).rejects.toThrow("Simulado não encontrado");
  });
});
