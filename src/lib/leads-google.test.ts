import { describe, expect, it } from "vitest";
import { prepararLeadGoogle } from "./leads-google";

const base = {
  lead_id: "abc123",
  form_id: 111,
  gcl_id: "EAIa",
  google_key: "segredo",
  lead_submit_time: "2026-10-21T12:00:00Z",
  user_column_data: [
    { column_id: "FULL_NAME", column_name: "Full Name", string_value: "Maria Souza" },
    { column_id: "EMAIL", column_name: "User Email", string_value: "maria@example.com" },
    { column_id: "PHONE_NUMBER", column_name: "User Phone", string_value: "+5548999998888" },
    { column_id: "x1", column_name: "Qual carreira você quer?", string_value: "Fiscal" },
    { column_id: "x2", column_name: "Como você estuda hoje?", string_value: "Todos os dias" },
    { column_id: "x3", column_name: "Quantas horas por dia?", string_value: "5h ou mais" },
    { column_id: "x4", column_name: "Prazo da prova", string_value: "Até 6 meses" },
  ],
};

describe("prepararLeadGoogle", () => {
  it("pontua pelo rótulo da pergunta e grava os ids do Google", () => {
    const l = prepararLeadGoogle(base);
    expect(l.origem).toBe("google_form");
    expect(l.pontuacao).toBe(12);
    expect(l.segmento).toBe("quente");
    expect(l.nome).toBe("Maria Souza");
    expect(l.email).toBe("maria@example.com");
    expect(l.telefone).toBe("+5548999998888");
    expect(l.meta_lead_id).toBeNull();
    expect(l.google_lead_id).toBe("abc123");
    expect(l.gclid).toBe("EAIa");
    expect(l.form_id).toBe("111");
  });

  it("nunca guarda a google_key no payload bruto", () => {
    expect(JSON.stringify(prepararLeadGoogle(base).payload_bruto)).not.toContain("segredo");
  });

  it("não lança com pergunta faltando: registra aviso", () => {
    const l = prepararLeadGoogle({ lead_id: "z", user_column_data: [{ column_id: "EMAIL", string_value: "a@b.com" }] });
    expect(l.avisos.length).toBeGreaterThan(0);
    expect(l.pontuacao).toBe(0);
  });
});
