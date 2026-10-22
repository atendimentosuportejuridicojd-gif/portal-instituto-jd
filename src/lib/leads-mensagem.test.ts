import { describe, expect, it } from "vitest";
import { ehFormulario, mensagemPrimeiroContato } from "./leads-mensagem";

describe("mensagemPrimeiroContato", () => {
  it("lead da Meta com carreira definida: texto idêntico ao usado hoje", () => {
    expect(mensagemPrimeiroContato({ nome: "Perim Silva", origem: "meta_form", carreira: "judiciária" })).toBe(
      "Olá, Perim! Aqui é da equipe do Instituto J&D.\n\nVi que você preencheu nosso formulário e tem foco na carreira judiciária. Vamos te ajudar com os próximos passos!\n\nVocê já tem algum concurso em vista que tenha interesse em fazer? Se sim, qual o cargo?",
    );
  });

  it("Google e site dão a mesma mensagem da Meta, com a carreira em minúsculas", () => {
    const meta = mensagemPrimeiroContato({ nome: "Ana", origem: "meta_form", carreira: "fiscal" });
    expect(mensagemPrimeiroContato({ nome: "Ana", origem: "google_form", carreira: "Fiscal" })).toBe(meta);
    expect(mensagemPrimeiroContato({ nome: "Ana", origem: "site_form", carreira: "Fiscal" })).toBe(meta);
  });

  it("sem carreira definida muda a pergunta (qualquer grafia)", () => {
    for (const c of ["Ainda não defini", "ainda_não_defini", "ainda_nao_defini", null]) {
      const m = mensagemPrimeiroContato({ nome: "Ana", origem: "site_form", carreira: c });
      expect(m).toContain("ainda está decidindo qual área e cargo seguir");
      expect(m).not.toContain("tem foco na carreira");
    }
  });

  it("Diagnóstico mantém a mensagem antiga", () => {
    expect(mensagemPrimeiroContato({ nome: "Ana", origem: "diagnostico" })).toContain("fez nosso diagnóstico");
    expect(ehFormulario("diagnostico")).toBe(false);
  });
});
