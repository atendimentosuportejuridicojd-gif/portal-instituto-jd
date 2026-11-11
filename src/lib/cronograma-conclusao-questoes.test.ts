import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/acervo.server", () => ({ assertAcessoAluno: async () => undefined }));

import { concluirBlocosDeQuestoes } from "@/lib/cronograma-aluno.server";

/** Cliente Supabase mínimo com select e update encadeáveis (eq/in) sobre tabelas em memória. */
function fake(tabelas: Record<string, any[]>) {
  return {
    from(nome: string) {
      let linhas = tabelas[nome] ?? [];
      let patch: Record<string, unknown> | null = null;
      const b: any = {
        select: () => b,
        update: (p: Record<string, unknown>) => ((patch = p), b),
        eq: (c: string, v: unknown) => ((linhas = linhas.filter((r) => r[c] === v)), b),
        in: (c: string, vs: unknown[]) => ((linhas = linhas.filter((r) => vs.includes(r[c]))), b),
        then: (res: any, rej: any) => {
          if (patch) linhas.forEach((r) => Object.assign(r, patch));
          return Promise.resolve({ data: linhas.map((r) => ({ id: r.id })), error: null }).then(res, rej);
        },
      };
      return b;
    },
  };
}

function cenario() {
  return {
    cronogramas_aluno: [
      { id: "cr1", user_id: "u1", status: "ativo" },
      { id: "cr0", user_id: "u1", status: "arquivado" },
      { id: "cr2", user_id: "u2", status: "ativo" },
    ],
    cronograma_blocos: [
      { id: "estudo", cronograma_id: "cr1", tipo: "estudo", material_id: "m1", concluido: false },
      { id: "q1", cronograma_id: "cr1", tipo: "questoes", material_id: "m1", concluido: false },
      { id: "q1-cont", cronograma_id: "cr1", tipo: "questoes", material_id: "m1", concluido: false },
      { id: "q2", cronograma_id: "cr1", tipo: "questoes", material_id: "m2", concluido: false },
      { id: "q1-arquivado", cronograma_id: "cr0", tipo: "questoes", material_id: "m1", concluido: false },
      { id: "q1-outro-aluno", cronograma_id: "cr2", tipo: "questoes", material_id: "m1", concluido: false },
    ],
  };
}

describe("concluirBlocosDeQuestoes", () => {
  it("conclui só os blocos de questões da matéria no cronograma ativo do aluno", async () => {
    const t = cenario();
    const n = await concluirBlocosDeQuestoes(fake(t), "u1", "m1");
    const feitos = t.cronograma_blocos.filter((b: any) => b.concluido).map((b) => b.id);
    expect(n).toBe(2);
    expect(feitos.sort()).toEqual(["q1", "q1-cont"]);
    expect((t.cronograma_blocos.find((b: any) => b.id === "q1") as any).concluido_em).toBeTruthy();
  });

  it("não faz nada quando o aluno não tem cronograma ativo", async () => {
    const t = cenario();
    t.cronogramas_aluno = t.cronogramas_aluno.filter((c) => c.status !== "ativo");
    expect(await concluirBlocosDeQuestoes(fake(t), "u1", "m1")).toBe(0);
    expect(t.cronograma_blocos.some((b: any) => b.concluido)).toBe(false);
  });

  it("não reativa o que o aluno já tinha concluído (conta só os pendentes)", async () => {
    const t = cenario();
    (t.cronograma_blocos.find((b: any) => b.id === "q1") as any).concluido = true;
    expect(await concluirBlocosDeQuestoes(fake(t), "u1", "m1")).toBe(1);
  });
});
