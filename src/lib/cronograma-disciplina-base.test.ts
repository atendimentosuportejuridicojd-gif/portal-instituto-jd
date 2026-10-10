import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/acervo.server", () => ({ assertAcessoAluno: async () => undefined }));
vi.mock("@/lib/questoes-count", () => ({
  contarQuestoesPorMaterial: async () =>
    new Map([
      ["m1", 40],
      ["mc1", 10],
    ]),
}));

import { carregarDisciplinas } from "@/lib/cronograma-aluno.server";

/** Supabase mínimo: filtra por eq/in e devolve as linhas na ordem cadastrada. */
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

const mat = (id: string, disciplina_id: string, ordem: number, publicado = true) => ({
  id, titulo: `Matéria ${id}`, disciplina_id, ordem, tempo_leitura: 30, publicado, tipo: "markdown",
});

function dados(estrutura: string[], vinculos: string[] = []) {
  return fake({
    concurso_prova_estrutura: estrutura.map((d, i) => ({ concurso_id: "c1", disciplina_id: d, qtd_questoes: 10, peso: 2 - i * 0.5, ordem: i })),
    disciplinas: [
      { id: "dc", nome: "Direito Constitucional", especifica: false, concurso_id: null, disciplina_base_id: null, ordem: 1 },
      { id: "ds-comp", nome: "Direito Constitucional — Tópicos Complementares", especifica: true, concurso_id: "c1", disciplina_base_id: "dc", ordem: 8 },
      { id: "ds-reg", nome: "Conhecimentos Regionais de SC", especifica: true, concurso_id: "c1", disciplina_base_id: null, ordem: 1 },
      { id: "ds-outro", nome: "Complemento de outro concurso", especifica: true, concurso_id: "c2", disciplina_base_id: "dc", ordem: 9 },
    ],
    materiais: [
      mat("m1", "dc", 1), mat("m2", "dc", 2),
      mat("mc1", "ds-comp", 1), mat("mc2", "ds-comp", 2, false), // rascunho: fica de fora
      mat("mr1", "ds-reg", 1),
      mat("mo1", "ds-outro", 1),
    ],
    concurso_materiais: vinculos.map((m) => ({ concurso_id: "c1", material_id: m })),
  });
}

describe("disciplina específica vinculada ao Acervo Base", () => {
  it("as matérias complementares entram na disciplina-base, depois das do Acervo Base, e não viram disciplina à parte", async () => {
    // O admin listou também a complementar na estrutura por engano: ela não pode duplicar.
    const r = await carregarDisciplinas(dados(["dc", "ds-reg", "ds-comp"]), "c1", undefined);
    expect(r.map((d) => d.id)).toEqual(["dc", "ds-reg"]);
    expect(r[0].materias.map((m) => m.id)).toEqual(["m1", "m2", "mc1"]); // mc2 é rascunho; mo1 é de outro concurso
    expect(r[1].materias.map((m) => m.id)).toEqual(["mr1"]);
  });

  it("sem vínculo, a específica continua sendo uma disciplina própria (ex.: Conhecimentos Regionais)", async () => {
    const r = await carregarDisciplinas(dados(["ds-reg"]), "c1", undefined);
    expect(r.map((d) => d.id)).toEqual(["ds-reg"]);
  });

  it("se a disciplina-base não faz parte da prova, a complementar fica como disciplina própria", async () => {
    const r = await carregarDisciplinas(dados(["ds-comp"]), "c1", undefined);
    expect(r.map((d) => d.id)).toEqual(["ds-comp"]);
    expect(r[0].materias.map((m) => m.id)).toEqual(["mc1"]);
  });

  it("a regra 'só as vinculadas ao concurso' vale separadamente para a base e para a complementar", async () => {
    // Só m1 está vinculada na base (m2 sai); nada vinculado na complementar (entram todas as publicadas).
    const r = await carregarDisciplinas(dados(["dc"], ["m1"]), "c1", undefined);
    expect(r[0].materias.map((m) => m.id)).toEqual(["m1", "mc1"]);
  });

  it("matérias sem questões usam a média da disciplina já com as complementares", async () => {
    const r = await carregarDisciplinas(dados(["dc"]), "c1", undefined);
    const porId = Object.fromEntries(r[0].materias.map((m) => [m.id, m]));
    expect(porId.m1.qtdReal).toBe(40);
    expect(porId.mc1.qtdReal).toBe(10);
    expect(porId.m2.qtdReal).toBe(0);
    expect(porId.m2.qtdQuestoes).toBe(25); // média de 40 e 10
  });
});
