import { describe, expect, it, vi } from "vitest";
import { renderToString } from "react-dom/server";

vi.mock("@tanstack/react-router", () => ({
  Link: ({ children }: { children: React.ReactNode }) => <a>{children}</a>,
}));
// A matéria "m-andamento" tem 12 de 30 questões respondidas e não terminada; as demais, nenhuma sessão.
vi.mock("@/hooks/use-sessoes-andamento", () => ({
  useSessoesEmAndamento: () => ({
    emAndamento: (id: string) => (id === "m-andamento" ? { material_id: id, respondidas: 12, total: 30 } : null),
  }),
}));

import { BotaoQuestoes } from "@/components/botao-questoes";
import { EmptyState, PageHeader, SecaoTitulo } from "@/components/page";
import { BookOpen } from "lucide-react";

describe("botão de questões", () => {
  it("quando o aluno começou e não terminou, mostra 'Retomar as questões' com o andamento", () => {
    const html = renderToString(<BotaoQuestoes materialId="m-andamento" />).replace(/<!-- -->/g, "");
    expect(html).toContain("Retomar as questões");
    expect(html).toContain("12/30");
    expect(html).not.toContain("Resolver questões");
  });

  it("sem sessão em andamento, mostra o rótulo normal", () => {
    expect(renderToString(<BotaoQuestoes materialId="m-novo" />)).toContain("Resolver questões");
    expect(renderToString(<BotaoQuestoes materialId="m-novo" rotulo="Resolver" />)).toContain("Resolver");
  });

  it("quem já concluiu uma tentativa vê 'Refazer questões', mas a sessão em andamento tem prioridade", () => {
    expect(renderToString(<BotaoQuestoes materialId="m-novo" jaFez />)).toContain("Refazer questões");
    const html = renderToString(<BotaoQuestoes materialId="m-andamento" jaFez />);
    expect(html).toContain("Retomar as questões");
    expect(html).not.toContain("Refazer questões");
  });
});

describe("peças compartilhadas do portal", () => {
  it("cabeçalho de página, estado vazio e título de seção renderizam", () => {
    const cab = renderToString(<PageHeader icone={BookOpen} rotulo="Biblioteca" title="Acervo Base" description="Descrição" actions={<b>ação</b>} />);
    expect(cab).toContain("Acervo Base");
    expect(cab).toContain("Biblioteca");
    expect(cab).toContain("ação");
    expect(renderToString(<PageHeader title="Só o título" />)).toContain("Só o título");
    expect(renderToString(<EmptyState icon={BookOpen} title="Vazio" description="Nada aqui" />)).toContain("Nada aqui");
    expect(renderToString(<SecaoTitulo icone={BookOpen}>Minha seção</SecaoTitulo>)).toContain("Minha seção");
  });
});
