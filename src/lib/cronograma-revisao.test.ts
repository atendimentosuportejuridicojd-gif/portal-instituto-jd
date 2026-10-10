import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/acervo.server", () => ({ assertAcessoAluno: async () => undefined }));
// Questões cadastradas por matéria (M6 ainda não tem nenhuma).
vi.mock("@/lib/questoes-count", () => ({
  contarQuestoesPorMaterial: async () =>
    new Map([
      ["m1", 40],
      ["m2", 50],
      ["m3", 30],
      ["m4", 20],
      ["m5", 60],
    ]),
}));

import { revisaoDoBloco } from "@/lib/cronograma-aluno.server";

/** Cliente Supabase mínimo: filtra por eq/in e devolve as linhas na ordem em que foram cadastradas. */
function fake(tabelas: Record<string, any[]>) {
  return {
    from(nome: string) {
      let linhas = [...(tabelas[nome] ?? [])];
      const b: any = {
        select: () => b,
        eq: (c: string, v: unknown) => ((linhas = linhas.filter((r) => r[c] === v)), b),
        in: (c: string, vs: unknown[]) => ((linhas = linhas.filter((r) => vs.includes(r[c]))), b),
        order: () => b,
        limit: () => b,
        range: () => b,
        maybeSingle: () => Promise.resolve({ data: linhas[0] ?? null, error: null }),
        then: (res: any, rej: any) => Promise.resolve({ data: linhas, error: null }).then(res, rej),
      };
      return b;
    },
  };
}

const tabelas = {
  concurso_prova_estrutura: [
    { concurso_id: "c1", disciplina_id: "d1", qtd_questoes: 10, peso: 2, ordem: 0 },
    { concurso_id: "c1", disciplina_id: "d2", qtd_questoes: 10, peso: 1, ordem: 1 },
  ],
  disciplinas: [
    { id: "d1", nome: "Português" },
    { id: "d2", nome: "Constitucional" },
  ],
  materiais: [
    { id: "m1", titulo: "Concordância", disciplina_id: "d1", tempo_leitura: 40, ordem: 1, publicado: true, tipo: "markdown" },
    { id: "m2", titulo: "Crase", disciplina_id: "d1", tempo_leitura: 40, ordem: 2, publicado: true, tipo: "markdown" },
    { id: "m3", titulo: "Pontuação", disciplina_id: "d1", tempo_leitura: 40, ordem: 3, publicado: true, tipo: "markdown" },
    { id: "m4", titulo: "Direitos", disciplina_id: "d2", tempo_leitura: 40, ordem: 1, publicado: true, tipo: "markdown" },
    { id: "m5", titulo: "Poderes", disciplina_id: "d2", tempo_leitura: 40, ordem: 2, publicado: true, tipo: "markdown" },
    { id: "m6", titulo: "Controle", disciplina_id: "d2", tempo_leitura: 40, ordem: 3, publicado: true, tipo: "markdown" },
  ],
  concurso_materiais: [],
  cronogramas_aluno: [
    { id: "cr1", user_id: "u1", concurso_id: "c1", ordem_disciplinas: ["d1", "d2"], minutos_por_questao: 3 },
  ],
  cronograma_blocos: [
    { id: "b1", cronograma_id: "cr1", tipo: "revisao", disciplina_id: "d1", minutos: 60 },
    { id: "b2", cronograma_id: "cr1", tipo: "revisao", disciplina_id: "d2", minutos: 60 },
    { id: "b3", cronograma_id: "cr1", tipo: "estudo", disciplina_id: "d1", minutos: 40 },
  ],
  // Mais recentes primeiro (como a consulta ordena): m5 teve 88% agora e 50% antes.
  questao_sessoes: [
    { material_id: "m1", user_id: "u1", status: "concluida", percentual: 90, acertos: 36, total_questoes: 40 },
    { material_id: "m2", user_id: "u1", status: "concluida", percentual: 60, acertos: 30, total_questoes: 50 },
    { material_id: "m4", user_id: "u1", status: "concluida", percentual: 70, acertos: 14, total_questoes: 20 },
    { material_id: "m5", user_id: "u1", status: "concluida", percentual: 88, acertos: 53, total_questoes: 60 },
    { material_id: "m5", user_id: "u1", status: "concluida", percentual: 50, acertos: 30, total_questoes: 60 },
    // Sessão em andamento não conta; sessão de outro aluno também não.
    { material_id: "m3", user_id: "u1", status: "em_andamento", percentual: 0, acertos: 0, total_questoes: 30 },
    { material_id: "m3", user_id: "u2", status: "concluida", percentual: 99, acertos: 30, total_questoes: 30 },
  ],
};

const ctx = { supabase: fake(tabelas), userId: "u1" };

describe("revisão por desempenho (meta de 85%)", () => {
  it("revisão da 1ª disciplina: só as matérias dela abaixo da meta, primeiro as não resolvidas", async () => {
    const r = await revisaoDoBloco(ctx, "b1");
    expect(r.meta).toBe(85);
    expect(r.disciplina).toBe("Português");
    expect(r.itens.map((i) => i.material_id)).toEqual(["m3", "m2"]);
    expect(r.itens[0].estado).toBe("sem_resolucao");
    expect(r.itens[1]).toMatchObject({ estado: "abaixo", percentual: 60 });
    expect(r.resumo.aprovadas).toBe(1); // m1 (90%)
  });

  it("revisão da 2ª disciplina acumula as pendentes da anterior; usa a última sessão; ignora matéria sem questões", async () => {
    const r = await revisaoDoBloco(ctx, "b2");
    expect(r.disciplina).toBe("Constitucional");
    // m3 (não resolvida), m2 (60%), m4 (70%); m1 (90%) e m5 (88% na última sessão) aprovadas.
    expect(r.itens.map((i) => i.material_id)).toEqual(["m3", "m2", "m4"]);
    expect(r.resumo).toMatchObject({ paraRevisar: 3, aprovadas: 2, semQuestoes: 1 }); // m6 sem questões
    expect(r.resumo.minutosEstimados).toBe((30 + 50 + 20) * 3);
    expect(r.resumo.minutosReservados).toBe(60);
  });

  it("recusa blocos que não são de revisão", async () => {
    await expect(revisaoDoBloco(ctx, "b3")).rejects.toThrow("Bloco de revisão não encontrado");
  });

  it("não enxerga bloco de outro aluno", async () => {
    await expect(revisaoDoBloco({ supabase: ctx.supabase, userId: "u2" }, "b1")).rejects.toThrow("Cronograma não encontrado");
  });
});
