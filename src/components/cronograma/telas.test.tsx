import { describe, expect, it, vi } from "vitest";
import { renderToString } from "react-dom/server";

// Teste de fumaça: renderiza as telas do cronograma no servidor com dados de exemplo para pegar erros de execução
// (o visual em si precisa ser conferido no navegador).
vi.mock("@tanstack/react-router", () => ({
  Link: ({ children }: { children: React.ReactNode }) => <a>{children}</a>,
}));
vi.mock("@tanstack/react-start", () => ({ useServerFn: (f: unknown) => f }));
vi.mock("@tanstack/react-query", () => ({
  useQueryClient: () => ({ invalidateQueries: () => undefined, setQueryData: () => undefined }),
  useMutation: () => ({ mutate: () => undefined, isPending: false, data: undefined, error: null }),
  useQuery: () => ({ data: undefined, isLoading: true, error: null }),
}));
vi.mock("sonner", () => ({ toast: { error: () => undefined, success: () => undefined } }));
vi.mock("@/lib/cronograma-aluno.functions", () => ({
  alunoMarcarBloco: () => undefined,
  alunoRecalcularCronograma: () => undefined,
  alunoCriarCronograma: () => undefined,
  alunoPreviaCronograma: () => undefined,
  alunoRevisaoBloco: () => undefined,
}));
vi.mock("@/lib/simulado-checkout", () => ({ iniciarCheckoutSimulado: () => undefined }));
vi.mock("@/components/checkout-simulado", () => ({ CheckoutSimulado: () => null }));

import { Assistente } from "@/components/cronograma/assistente";
import { PlanoDoAluno, type EstadoCronograma } from "@/components/cronograma/plano";
import { AnelProgresso, corDisciplina, ListaArrastavel, Passos, SeloTipo } from "@/components/cronograma/visual";

const estado: EstadoCronograma = {
  hoje: "2026-10-12",
  diasAteProva: 61,
  diasAtrasados: 1,
  progresso: { totalMinutos: 600, feitoMinutos: 120, percentual: 20 },
  disciplinas: [
    { id: "d1", nome: "Língua Portuguesa" },
    { id: "d2", nome: "Direito Constitucional" },
  ],
  cronograma: {
    concurso_nome: "TJSC — Técnico Judiciário",
    data_inicio: "2026-10-05",
    data_prova: "2026-12-12",
    usa_simulado: true,
    ordem_disciplinas: ["d1", "d2"],
    resumo: { cabe: true, diasSobra: 20, fimEstudo: "2026-11-20", faseFinal: { inicio: "2026-11-29", fim: "2026-12-11" }, disciplinasForaDoPlano: [] },
  },
  blocos: [
    { id: "b1", data: "2026-10-10", ordem: 0, tipo: "estudo", disciplina_id: "d1", material_id: "m1", titulo: "Crase", minutos: 45, continuacao: false, concluido: false },
    { id: "b2", data: "2026-10-12", ordem: 0, tipo: "questoes", disciplina_id: "d1", material_id: "m1", titulo: "Crase", minutos: 60, continuacao: false, concluido: true },
    { id: "b3", data: "2026-10-12", ordem: 1, tipo: "revisao", disciplina_id: "d1", material_id: null, titulo: "Revisão — Língua Portuguesa", minutos: 30, continuacao: false, concluido: false },
    { id: "b4", data: "2026-10-13", ordem: 0, tipo: "simulado", disciplina_id: null, material_id: null, titulo: "Simulado", minutos: 120, continuacao: false, concluido: false },
    { id: "b5", data: "2026-12-01", ordem: 0, tipo: "fase_final", disciplina_id: null, material_id: null, titulo: "Fase final", minutos: 180, continuacao: false, concluido: false },
  ],
};

describe("telas do cronograma (renderização)", () => {
  it("o plano renderiza o cabeçalho, os indicadores e as abas", () => {
    const html = renderToString(<PlanoDoAluno estado={estado} onNovo={() => undefined} />);
    expect(html).toContain("TJSC — Técnico Judiciário");
    expect(html).toContain("dias para a prova");
    expect(html).toContain("Atividade em atraso"); // destaque da próxima ação: a atrasada vem primeiro
    expect(html).toContain("Como funciona o seu cronograma: Método J&amp;D"); // aviso do método (recolhido no servidor)
    expect(html).toContain("Semana");
    expect(html).toContain("Disciplinas");
  });

  it("o plano renderiza sem blocos e com a prova já chegando", () => {
    const vazio: EstadoCronograma = { ...estado, blocos: [], diasAtrasados: 0, diasAteProva: 0, progresso: { totalMinutos: 0, feitoMinutos: 0, percentual: 0 } };
    expect(() => renderToString(<PlanoDoAluno estado={vazio} onNovo={() => undefined} />)).not.toThrow();
  });

  it("o assistente renderiza o primeiro passo com os concursos", () => {
    const html = renderToString(
      <Assistente
        dados={{
          hoje: "2026-10-12",
          simuladoLiberado: false,
          concursos: [
            { id: "c1", nome: "SEFAZ SC 2026", orgao: "SEFAZ-SC", banca: "FCC", estado: "SC", ano: 2026, data_prova: "2026-11-22", pronto: true },
            { id: "c2", nome: "TJSC", orgao: null, banca: null, estado: null, ano: null, data_prova: null, pronto: false },
          ],
        }}
        rascunho={null}
        onCriado={() => undefined}
      />,
    );
    expect(html).toContain("Para qual concurso você vai estudar?");
    expect(html).toContain("SEFAZ SC 2026");
    expect(html).toContain("Em breve");
  });

  it("componentes visuais: passos, selo, anel e lista arrastável", () => {
    expect(renderToString(<Passos nomes={["A", "B", "C"]} atual={1} />)).toContain("aria-current=\"step\"");
    expect(renderToString(<SeloTipo tipo="revisao" />)).toContain("Revisão");
    expect(renderToString(<AnelProgresso valor={50}>50%</AnelProgresso>)).toContain("50%");
    expect(corDisciplina(0)).toEqual(corDisciplina(10));
    const lista = renderToString(
      <ListaArrastavel
        itens={[{ id: "x", n: "Primeira" }, { id: "y", n: "Segunda" }]}
        idDe={(i) => i.id}
        aoReordenar={() => undefined}
        renderItem={(i, _idx, { alca }) => (
          <div>
            <button type="button" {...alca}>alça</button>
            {i.n}
          </div>
        )}
      />,
    );
    expect(lista).toContain("Primeira");
    expect(lista).toContain("Segunda");
    expect(lista).toContain("touch-action:none");
  });
});
