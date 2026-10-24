import { describe, expect, it } from "vitest";
import { normalizarBanca } from "./banca";

describe("normalizarBanca", () => {
  it("reconhece as três bancas pelo nome ou sigla", () => {
    expect(normalizarBanca("Fundação Getúlio Vargas – FGV")).toBe("FGV");
    expect(normalizarBanca("Cespe/Cebraspe")).toBe("CEBRASPE");
    expect(normalizarBanca("fcc")).toBe("FCC");
  });
  it("banca não definida não filtra", () => {
    expect(normalizarBanca("A definir")).toBeNull();
    expect(normalizarBanca(null)).toBeNull();
  });
});
