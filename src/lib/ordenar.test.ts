import { describe, expect, it } from "vitest";
import { deslocamento, indiceAlvo, moverItem } from "@/lib/ordenar";

describe("moverItem", () => {
  const base = ["a", "b", "c", "d"];

  it("move para baixo e para cima sem alterar a lista original", () => {
    expect(moverItem(base, 0, 2)).toEqual(["b", "c", "a", "d"]);
    expect(moverItem(base, 3, 0)).toEqual(["d", "a", "b", "c"]);
    expect(base).toEqual(["a", "b", "c", "d"]);
  });

  it("limita às pontas e ignora posições inválidas", () => {
    expect(moverItem(base, 1, 99)).toEqual(["a", "c", "d", "b"]);
    expect(moverItem(base, 2, -5)).toEqual(["c", "a", "b", "d"]);
    expect(moverItem(base, 9, 0)).toEqual(base);
    expect(moverItem(base, 1, 1)).toEqual(base);
  });
});

describe("indiceAlvo", () => {
  // três itens de 40 px com 8 px de espaço: centros em 20, 68 e 116
  const r = [
    { top: 0, height: 40 },
    { top: 48, height: 40 },
    { top: 96, height: 40 },
  ];

  it("sem mover, o item fica onde estava", () => {
    expect(indiceAlvo(r, 0, 20)).toBe(0);
    expect(indiceAlvo(r, 1, 68)).toBe(1);
    expect(indiceAlvo(r, 2, 116)).toBe(2);
  });

  it("arrastando para baixo passa um item quando o centro ultrapassa o centro do vizinho", () => {
    expect(indiceAlvo(r, 0, 60)).toBe(0); // ainda não passou o centro do 2º (68)
    expect(indiceAlvo(r, 0, 70)).toBe(1);
    expect(indiceAlvo(r, 0, 130)).toBe(2);
  });

  it("arrastando para cima", () => {
    expect(indiceAlvo(r, 2, 100)).toBe(2);
    expect(indiceAlvo(r, 2, 60)).toBe(1);
    expect(indiceAlvo(r, 2, 10)).toBe(0);
  });
});

describe("deslocamento dos itens vizinhos", () => {
  it("quando o item desce, os que ele ultrapassa sobem um passo", () => {
    expect([0, 1, 2, 3].map((i) => deslocamento(i, 0, 2, 48))).toEqual([0, -48, -48, 0]);
  });
  it("quando o item sobe, os que ele ultrapassa descem um passo", () => {
    expect([0, 1, 2, 3].map((i) => deslocamento(i, 3, 1, 48))).toEqual([0, 48, 48, 0]);
  });
  it("sem troca de posição, ninguém se mexe", () => {
    expect([0, 1, 2].map((i) => deslocamento(i, 1, 1, 48))).toEqual([0, 0, 0]);
  });
});
