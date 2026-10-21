import { describe, expect, it } from "vitest";
import { fimAnual, precosPlano, priceIdPlano, statusPortal } from "@/lib/assinatura-planos";

describe("planos de assinatura", () => {
  it("judiciária e policial: R$ 76,90/mês e R$ 784,38 anual", () => {
    expect(precosPlano("judiciaria")).toMatchObject({ mensal: 76.9, anual: 784.38 });
    expect(precosPlano("policial")).toMatchObject({ mensal: 76.9, anual: 784.38 });
  });
  it("fiscal: R$ 129,90/mês e R$ 1.324,98 anual", () => {
    expect(precosPlano("fiscal")).toMatchObject({ mensal: 129.9, anual: 1324.98 });
  });
  it("plano escolhido segue a carreira do perfil", () => {
    expect(priceIdPlano("fiscal", "anual")).toBe("fiscal_anual");
    expect(priceIdPlano(null, "mensal")).toBe("judiciaria_mensal");
  });
  it("falta de pagamento bloqueia o acesso", () => {
    expect(statusPortal("past_due")).toBe("inadimplente");
    expect(statusPortal("unpaid")).toBe("inadimplente");
    expect(statusPortal("active")).toBe("ativa");
  });
  it("anual dá exatamente 1 ano de acesso", () => {
    expect(fimAnual(new Date("2026-10-21T12:00:00Z"))).toBe("2027-10-21T12:00:00.000Z");
  });
});
