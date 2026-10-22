import { describe, expect, it } from "vitest";
import { montarLinhaSite, PERGUNTAS_SITE } from "./leads-site";

const base = {
  nome: "Maria Souza",
  email: "maria@example.com",
  telefone: "(48) 99999-8888",
  carreira: "Fiscal",
  como_estuda: "Todos os dias",
  horas_dia: "3 a 4h",
  prazo_prova: "6 a 12 meses",
};

describe("montarLinhaSite", () => {
  it("grava como site_form, pontua e normaliza o telefone", () => {
    const l = montarLinhaSite({ ...base, gclid: "CLICK1" });
    expect(l.origem).toBe("site_form");
    expect(l.nome).toBe("Maria Souza");
    expect(l.email).toBe("maria@example.com");
    expect(l.telefone).toBe("+5548999998888");
    expect([l.carreira, l.como_estuda, l.horas_dia, l.prazo_prova]).toEqual(["Fiscal", "Todos os dias", "3 a 4h", "6 a 12 meses"]);
    expect(l.pontuacao).toBe(3 + 3 + 2 + 2);
    expect(l.segmento).toBe("quente");
    expect(l.avisos).toEqual([]);
    expect(l.meta_lead_id).toBeNull();
    expect(l.gclid).toBe("CLICK1");
    expect(l.consentimento).toBe(true);
  });

  it("todas as opções do formulário são reconhecidas pela pontuação (sem aviso de resposta desconhecida)", () => {
    for (const p of PERGUNTAS_SITE) {
      for (const op of p.opcoes) {
        const l = montarLinhaSite({ ...base, [p.id]: op });
        expect(l.avisos.filter((a) => a.includes("desconhecida")), `${p.id}: ${op}`).toEqual([]);
      }
    }
  });

  it("lead com respostas fracas fica frio", () => {
    const l = montarLinhaSite({ ...base, carreira: "Ainda não defini", como_estuda: "Ainda não comecei", horas_dia: "Menos de 1h", prazo_prova: "Sem prazo definido" });
    expect(l.pontuacao).toBe(0);
    expect(l.segmento).toBe("frio");
  });
});
