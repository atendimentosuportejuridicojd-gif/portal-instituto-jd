import { describe, expect, it } from "vitest";
import { diferencaDias, gerarPlano, somarDias, type ParametrosPlano } from "@/lib/cronograma-motor";

type Semana = ParametrosPlano["minutosPorDiaSemana"];

const disciplinas = (n: number, materias: number, leitura = 40, q = 10) =>
  Array.from({ length: n }, (_, i) => ({
    id: `d${i + 1}`,
    nome: `Disciplina ${i + 1}`,
    materias: Array.from({ length: materias }, (_, j) => ({
      id: `d${i + 1}m${j + 1}`,
      titulo: `Matéria ${i + 1}.${j + 1}`,
      minutosLeitura: leitura,
      qtdQuestoes: q,
    })),
  }));

// Dom..Sáb
const semana: Semana = [0, 180, 180, 180, 180, 180, 120];

/** Regras que valem para qualquer plano gerado. */
function confere(p: ParametrosPlano, r: ReturnType<typeof gerarPlano>) {
  const ultimo = somarDias(p.dataProva, -1);
  const porDia = new Map<string, number>();
  for (const b of r.blocos) {
    expect(b.data >= p.dataInicio && b.data <= ultimo).toBe(true);
    if (b.tipo === "simulado" || b.tipo === "fase_final") continue;
    porDia.set(b.data, (porDia.get(b.data) ?? 0) + b.minutos);
  }
  for (const [d, m] of porDia) {
    const cap = p.minutosPorDiaSemana[new Date(`${d}T00:00:00Z`).getUTCDay()];
    const sim = r.simulados.includes(d) ? (p.minutosSimulado ?? 0) : 0;
    expect(m).toBeLessThanOrEqual(Math.max(0, cap - sim));
  }
  const colocado = r.blocos
    .filter((b) => ["estudo", "questoes", "revisao"].includes(b.tipo))
    .reduce((a, b) => a + b.minutos, 0);
  expect(colocado + r.faltamMinutos).toBe(r.minutosNecessarios);
  expect(r.cabe).toBe(r.faltamMinutos === 0);
  // Uma disciplina por vez: o índice da disciplina nunca volta atrás.
  let maior = 0;
  for (const b of r.blocos.filter((x) => x.disciplinaId && x.tipo !== "revisao")) {
    const n = Number(b.disciplinaId!.slice(1));
    expect(n).toBeGreaterThanOrEqual(maior);
    maior = n;
  }
}

describe("motor do cronograma J&D", () => {
  it("cabe com folga e reserva as últimas 2 semanas para a fase final", () => {
    const p: ParametrosPlano = { dataInicio: "2026-10-12", dataProva: "2027-03-14", minutosPorDiaSemana: semana, disciplinas: disciplinas(6, 8) };
    const r = gerarPlano(p);
    confere(p, r);
    expect(r.cabe).toBe(true);
    expect(r.faseFinal).toEqual({ inicio: "2027-03-01", fim: "2027-03-13" });
    expect(diferencaDias(r.faseFinal!.inicio, p.dataProva)).toBe(13);
    expect(r.diasSobra).toBeGreaterThan(14);
    expect(r.disciplinasForaDoPlano).toEqual([]);
  });

  it("quando o tempo não cabe, diz quanto falta e quais disciplinas ficam de fora (sem fase final)", () => {
    const apertado: Semana = [0, 90, 90, 90, 90, 90, 0];
    const p: ParametrosPlano = { dataInicio: "2026-10-12", dataProva: "2026-12-10", minutosPorDiaSemana: apertado, disciplinas: disciplinas(6, 8) };
    const r = gerarPlano(p);
    confere(p, r);
    expect(r.cabe).toBe(false);
    expect(r.faltamMinutos).toBeGreaterThan(0);
    expect(r.faseFinal).toBeNull();
    expect(r.disciplinasForaDoPlano.length).toBeGreaterThan(0);
    expect(r.disciplinasForaDoPlano.length).toBeLessThan(6);
  });

  it("simulados a cada 15 dias a partir do início, reservando o tempo deles", () => {
    const p: ParametrosPlano = {
      dataInicio: "2026-10-12", dataProva: "2027-03-14", minutosPorDiaSemana: semana,
      disciplinas: disciplinas(6, 8), simulados: true, minutosSimulado: 120,
    };
    const r = gerarPlano(p);
    confere(p, r);
    expect(r.simulados[0]).toBe("2026-10-12");
    expect(r.simulados[1]).toBe("2026-10-27");
    expect(r.blocos.filter((b) => b.tipo === "simulado")).toHaveLength(r.simulados.length);
  });

  it("revisão de cada disciplina vem depois do estudo dela", () => {
    const p: ParametrosPlano = { dataInicio: "2026-10-12", dataProva: "2027-03-14", minutosPorDiaSemana: semana, disciplinas: disciplinas(3, 4) };
    const r = gerarPlano(p);
    for (const d of ["d1", "d2", "d3"]) {
      const est = r.blocos.filter((b) => b.disciplinaId === d && b.tipo !== "revisao");
      const rev = r.blocos.filter((b) => b.disciplinaId === d && b.tipo === "revisao");
      expect(rev.length).toBeGreaterThan(0);
      expect(rev[0].data >= est[est.length - 1].data).toBe(true);
    }
  });

  it("casos de borda: prova amanhã, início depois da prova e sem disciplinas", () => {
    const amanha = gerarPlano({ dataInicio: "2026-10-12", dataProva: "2026-10-13", minutosPorDiaSemana: semana, disciplinas: disciplinas(2, 3) });
    expect(amanha.diasDisponiveis).toBe(1);
    expect(amanha.cabe).toBe(false);
    const passada = gerarPlano({ dataInicio: "2026-10-12", dataProva: "2026-10-01", minutosPorDiaSemana: semana, disciplinas: disciplinas(2, 3) });
    expect(passada.diasDisponiveis).toBe(0);
    expect(passada.cabe).toBe(false);
    expect(passada.blocos).toHaveLength(0);
    const vazio = gerarPlano({ dataInicio: "2026-10-12", dataProva: "2027-03-14", minutosPorDiaSemana: semana, disciplinas: [] });
    expect(vazio.cabe).toBe(true);
  });
});
