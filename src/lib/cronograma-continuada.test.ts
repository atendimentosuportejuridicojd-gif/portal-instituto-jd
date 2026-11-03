import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/acervo.server", () => ({
  assertAcessoAluno: async () => undefined,
  getCarreiraUsuario: async () => "policial",
}));
vi.mock("@/lib/questoes-count", () => ({
  contarQuestoesPorMaterial: async () => new Map([["m1", 40]]),
}));

import { carregarDisciplinasTrilha, previaCronograma } from "@/lib/cronograma-aluno.server";

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

const mat = (id: string, disciplina_id: string, ordem: number, publicado = true, tipo = "markdown") => ({
  id,
  titulo: `Matéria ${id}`,
  disciplina_id,
  ordem,
  tempo_leitura: 30,
  publicado,
  tipo,
});

function dados() {
  return fake({
    disciplinas: [
      { id: "dp", nome: "Português", ordem: 2 },
      { id: "dd", nome: "Direito Penal", ordem: 1 },
      { id: "di", nome: "Informática", ordem: 3 },
    ],
    materiais: [
      mat("m1", "dp", 1),
      mat("m2", "dp", 2),
      mat("m3", "dd", 1),
      mat("m4", "dd", 2, false), // rascunho: fica de fora
      mat("m5", "di", 1, true, "pdf"), // não é markdown: fica de fora
      mat("m6", "di", 2),
      mat("fora", "dp", 3), // não está na trilha
    ],
    trilha_materiais: [
      { trilha_id: "t1", material_id: "m1" },
      { trilha_id: "t1", material_id: "m2" },
      { trilha_id: "t1", material_id: "m3" },
      { trilha_id: "t1", material_id: "m4" },
      { trilha_id: "t1", material_id: "m5" },
      { trilha_id: "t1", material_id: "m6" },
      { trilha_id: "t2", material_id: "fora" },
    ],
    trilhas: [{ id: "t1", nome: "Agente de Polícia Federal", carreiras: ["policial"] }],
  });
}

describe("preparação continuada: disciplinas da trilha", () => {
  it("usa só matérias publicadas e markdown da trilha, na ordem das disciplinas do Acervo", async () => {
    const r = await carregarDisciplinasTrilha(dados(), "t1", undefined);
    expect(r.map((d) => d.id)).toEqual(["dd", "dp", "di"]);
    expect(r[0].materias.map((m) => m.id)).toEqual(["m3"]); // m4 é rascunho
    expect(r[1].materias.map((m) => m.id)).toEqual(["m1", "m2"]); // "fora" não é da trilha
    expect(r[2].materias.map((m) => m.id)).toEqual(["m6"]); // m5 é pdf
  });

  it("respeita a ordem escolhida pelo aluno e completa com a ordem padrão", async () => {
    const r = await carregarDisciplinasTrilha(dados(), "t1", ["di", "dp"]);
    expect(r.map((d) => d.id)).toEqual(["di", "dp", "dd"]);
  });

  it("usa as questões reais da matéria e a média quando ela não tem questões", async () => {
    const r = await carregarDisciplinasTrilha(dados(), "t1", undefined);
    const portugues = r.find((d) => d.id === "dp")!;
    expect(portugues.materias.find((m) => m.id === "m1")).toMatchObject({ qtdQuestoes: 40, qtdReal: 40 });
    expect(portugues.materias.find((m) => m.id === "m2")).toMatchObject({ qtdQuestoes: 40, qtdReal: 0 }); // média da disciplina
  });

  it("matérias já concluídas saem do plano (recalcular)", async () => {
    const r = await carregarDisciplinasTrilha(dados(), "t1", undefined, new Set(["m1"]));
    expect(r.find((d) => d.id === "dp")!.materias.map((m) => m.id)).toEqual(["m2"]);
  });

  it("trilha sem matérias dá erro claro", async () => {
    await expect(carregarDisciplinasTrilha(dados(), "t-vazia", undefined)).rejects.toThrow(/ainda não tem matérias/);
  });
});

describe("preparação continuada: prévia do plano", () => {
  const ctx = (supabase: any) => ({ supabase, userId: "u1" });
  const base = {
    modo: "continuada" as const,
    trilha_id: "t1",
    data_inicio: "2099-01-05",
    minutos_por_dia: [0, 120, 120, 120, 120, 120, 0],
    minutos_por_questao: 3,
    usa_simulado: false,
  };

  it("não exige data de prova, não inclui simulados nem fase final", async () => {
    const r = await previaCronograma(ctx(dados()), base);
    expect(r.resumo.cabe).toBe(true);
    expect(r.resumo.faseFinal).toBeNull();
    expect(r.resumo.simulados).toEqual([]);
    expect(r.disciplinas.map((d: any) => d.id)).toEqual(["dd", "dp", "di"]);
    expect(r.disciplinas.every((d: any) => d.inicio && d.fim)).toBe(true);
  });

  it("ignora simulados mesmo se pedidos", async () => {
    const r = await previaCronograma(ctx(dados()), { ...base, usa_simulado: true, duracao_prova_min: 240 });
    expect(r.resumo.simulados).toEqual([]);
  });

  it("exige a trilha e pelo menos um dia de estudo", async () => {
    await expect(previaCronograma(ctx(dados()), { ...base, trilha_id: undefined })).rejects.toThrow(/Escolha a trilha/);
    await expect(
      previaCronograma(ctx(dados()), { ...base, minutos_por_dia: [0, 0, 0, 0, 0, 0, 0] }),
    ).rejects.toThrow(/pelo menos um dia/);
  });

  it("o modo pós-edital continua exigindo concurso e data da prova", async () => {
    await expect(
      previaCronograma(ctx(dados()), { ...base, modo: "pos_edital", trilha_id: undefined }),
    ).rejects.toThrow(/Escolha o concurso/);
    await expect(
      previaCronograma(ctx(dados()), { ...base, modo: "pos_edital", trilha_id: undefined, concurso_id: "c1" }),
    ).rejects.toThrow(/data da prova/);
  });
});
