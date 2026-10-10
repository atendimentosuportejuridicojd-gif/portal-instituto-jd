import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/acervo.server", () => ({ assertAcessoAluno: async () => undefined }));
vi.mock("@/lib/questoes-count", () => ({ contarQuestoesPorMaterial: async () => new Map() }));

import { excluirCronograma } from "@/lib/cronograma-aluno.server";

/** Banco mínimo com delete(): guarda as linhas e remove as que passam por todos os filtros eq(). */
function banco(linhas: any[]) {
  return {
    linhas,
    from(_nome: string) {
      const filtros: ((r: any) => boolean)[] = [];
      let apagar = false;
      const b: any = {
        delete: () => ((apagar = true), b),
        eq: (c: string, v: unknown) => (filtros.push((r) => r[c] === v), b),
        select: () => b,
        then: (res: any, rej: any) => {
          const alvo = linhas.filter((r) => filtros.every((f) => f(r)));
          if (apagar) alvo.forEach((r) => linhas.splice(linhas.indexOf(r), 1));
          return Promise.resolve({ data: alvo.map((r) => ({ id: r.id })), error: null }).then(res, rej);
        },
      };
      return b;
    },
  };
}

describe("excluir cronograma", () => {
  const dados = () => [
    { id: "c1", user_id: "u1", status: "ativo" },
    { id: "c2", user_id: "u1", status: "rascunho" },
    { id: "c3", user_id: "u1", status: "arquivado" },
    { id: "c4", user_id: "u2", status: "ativo" },
  ];

  it("exclui só o cronograma ativo do próprio aluno", async () => {
    const db = banco(dados());
    const r = await excluirCronograma({ supabase: db, userId: "u1" }, "ativo");
    expect(r.excluidos).toBe(1);
    expect(db.linhas.map((l) => l.id)).toEqual(["c2", "c3", "c4"]);
  });

  it("descarta só o rascunho e não toca no cronograma ativo", async () => {
    const db = banco(dados());
    const r = await excluirCronograma({ supabase: db, userId: "u1" }, "rascunho");
    expect(r.excluidos).toBe(1);
    expect(db.linhas.map((l) => l.id)).toEqual(["c1", "c3", "c4"]);
  });

  it("nunca apaga o cronograma de outro aluno", async () => {
    const db = banco(dados());
    await excluirCronograma({ supabase: db, userId: "u3" }, "ativo");
    expect(db.linhas).toHaveLength(4);
  });
});
