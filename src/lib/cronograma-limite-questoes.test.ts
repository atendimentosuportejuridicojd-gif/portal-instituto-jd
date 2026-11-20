import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/acervo.server", () => ({ assertAcessoAluno: async () => undefined }));
vi.mock("@/lib/questoes-count", () => ({
  contarQuestoesPorMaterial: async () =>
    new Map([
      ["m1", 40],
      ["m2", 5],
      ["m3", 40],
    ]),
}));

import {
  capar,
  ehQuestaoInedita,
  escolherQuestoes,
  lerLimite,
  limiteDaMateria,
} from "@/lib/cronograma-limite-questoes";
import { carregarDisciplinas, limiteQuestoesDaMateria } from "@/lib/cronograma-aluno.server";

const resumoComLimite = { limite_questoes: { por_materia: 10, materias: ["m1", "m2"] } };

describe("lerLimite / limiteDaMateria", () => {
  it("sem a chave no resumo, não há limite", () => {
    expect(lerLimite({ somente_questoes: true })).toBeNull();
    expect(lerLimite(null)).toBeNull();
    expect(lerLimite({ limite_questoes: { por_materia: 0, materias: [] } })).toBeNull();
    expect(lerLimite({ limite_questoes: { por_materia: 10 } })).toBeNull();
  });

  it("o limite vale só para as matérias listadas", () => {
    const l = lerLimite(resumoComLimite);
    expect(limiteDaMateria(l, "m1")).toBe(10);
    expect(limiteDaMateria(l, "m3")).toBeNull();
    expect(capar(l, "m1", 40)).toBe(10);
    expect(capar(l, "m2", 5)).toBe(5); // menos que o limite: fica como está
    expect(capar(l, "m3", 40)).toBe(40); // fora da lista: sem limite
    expect(capar(null, "m1", 40)).toBe(40);
  });
});

describe("ehQuestaoInedita", () => {
  it("reconhece as inéditas pela referência, com ou sem acento", () => {
    expect(ehQuestaoInedita("Questão inédita – Instituto J&D (estilo FCC)")).toBe(true);
    expect(ehQuestaoInedita("Inédita – estilo CEBRASPE (Instituto J&D)")).toBe(true);
    expect(ehQuestaoInedita("Questao inedita - Instituto J&D")).toBe(true);
    expect(ehQuestaoInedita("FCC 2024 / TRF 3ª Região / Analista Judiciário / Questão: 57")).toBe(false);
    expect(ehQuestaoInedita(null)).toBe(false);
  });
});

describe("escolherQuestoes", () => {
  const real = (n: number) => ({ id: `r${n}`, referencia: `FCC 2024 / Órgão / Questão: ${n}`, ordem: n });
  const inedita = (n: number) => ({ id: `i${n}`, referencia: "Questão inédita – Instituto J&D (estilo FCC)", ordem: n });

  it("traz só reais quando há reais suficientes, mesmo que as inéditas venham antes na ordem do banco", () => {
    const qs = [inedita(1), inedita(2), ...Array.from({ length: 12 }, (_, i) => real(i + 3))];
    const ids = escolherQuestoes(qs, 10);
    expect(ids).toHaveLength(10);
    expect(ids.every((id) => id.startsWith("r"))).toBe(true);
  });

  it("completa com inéditas quando faltam reais", () => {
    const qs = [real(1), real(2), real(3), inedita(4), inedita(5), inedita(6), inedita(7), inedita(8), inedita(9), inedita(10), inedita(11)];
    const ids = escolherQuestoes(qs, 10);
    expect(ids).toEqual(["r1", "r2", "r3", "i4", "i5", "i6", "i7", "i8", "i9", "i10"]);
  });

  it("matéria com menos questões que o limite traz todas", () => {
    expect(escolherQuestoes([real(1), inedita(2)], 10)).toEqual(["r1", "i2"]);
  });

  it("o que já foi respondido na sessão não sai da seleção, e responder não muda o conjunto", () => {
    const qs = [inedita(1), ...Array.from({ length: 12 }, (_, i) => real(i + 2))];
    const antes = escolherQuestoes(qs, 10);
    const respondidas = new Set([antes[0], antes[4]]);
    expect(new Set(escolherQuestoes(qs, 10, respondidas))).toEqual(new Set(antes));
    // Sessão antiga, em que o aluno respondeu uma inédita antes do limite existir: ela continua na seleção.
    expect(escolherQuestoes(qs, 10, new Set(["i1"]))).toContain("i1");
  });
});

describe("carregarDisciplinas com limite de questões", () => {
  function fake() {
    const tabelas: Record<string, any[]> = {
      concurso_prova_estrutura: [{ concurso_id: "c1", disciplina_id: "d1", qtd_questoes: 10, peso: 2, ordem: 0 }],
      disciplinas: [{ id: "d1", nome: "Direito", especifica: false, concurso_id: null, disciplina_base_id: null, ordem: 1 }],
      materiais: ["m1", "m2", "m3"].map((id, i) => ({
        id, titulo: `Matéria ${id}`, disciplina_id: "d1", ordem: i, tempo_leitura: 30, publicado: true, tipo: "markdown",
      })),
      concurso_materiais: [],
      concurso_materiais_excecao: [],
    };
    return {
      from(nome: string) {
        let linhas = [...(tabelas[nome] ?? [])];
        const b: any = {
          select: () => b,
          eq: (c: string, v: unknown) => ((linhas = linhas.filter((r) => r[c] === v)), b),
          in: (c: string, vs: unknown[]) => ((linhas = linhas.filter((r) => vs.includes(r[c]))), b),
          order: () => b,
          maybeSingle: () => Promise.resolve({ data: linhas[0] ?? null, error: null }),
          then: (res: any, rej: any) => Promise.resolve({ data: linhas, error: null }).then(res, rej),
        };
        return b;
      },
    };
  }

  it("limita a contagem só nas matérias listadas (e nunca aumenta)", async () => {
    const [d] = await carregarDisciplinas(fake(), "c1", undefined, undefined, lerLimite(resumoComLimite));
    const qtd = Object.fromEntries(d.materias.map((m) => [m.id, m.qtdQuestoes]));
    expect(qtd).toEqual({ m1: 10, m2: 5, m3: 40 });
    // A quantidade real continua a do banco (usada para saber se a matéria tem questões).
    expect(d.materias.find((m) => m.id === "m1")!.qtdReal).toBe(40);
  });

  it("sem limite, nada muda", async () => {
    const [d] = await carregarDisciplinas(fake(), "c1", undefined);
    expect(d.materias.map((m) => m.qtdQuestoes)).toEqual([40, 5, 40]);
  });
});

describe("limiteQuestoesDaMateria", () => {
  const supa = (linhas: any[]) => ({
    from() {
      let r = [...linhas];
      const b: any = {
        select: () => b,
        eq: (c: string, v: unknown) => ((r = r.filter((x) => x[c] === v)), b),
        maybeSingle: () => Promise.resolve({ data: r[0] ?? null, error: null }),
      };
      return b;
    },
  });

  it("lê o limite do cronograma ativo do aluno", async () => {
    const s = supa([
      { user_id: "u1", status: "ativo", resumo: resumoComLimite },
      { user_id: "u2", status: "ativo", resumo: {} },
    ]);
    expect(await limiteQuestoesDaMateria(s, "u1", "m1")).toBe(10);
    expect(await limiteQuestoesDaMateria(s, "u1", "m3")).toBeNull();
    expect(await limiteQuestoesDaMateria(s, "u2", "m1")).toBeNull();
    expect(await limiteQuestoesDaMateria(s, "u3", "m1")).toBeNull();
  });

  it("cronograma arquivado não impõe limite", async () => {
    const s = supa([{ user_id: "u1", status: "arquivado", resumo: resumoComLimite }]);
    expect(await limiteQuestoesDaMateria(s, "u1", "m1")).toBeNull();
  });
});
