import { describe, expect, it } from "vitest";
import { prepararLeadFormulario } from "./leads-meta";

const f = (name: string, v: string) => ({ name, values: [v] });

describe("perguntas do Formulário Carreira 360", () => {
  it("reconhece tempo por dia e prazo da prova pelos títulos reais e soma 12", () => {
    const r = prepararLeadFormulario(
      {
        id: "1",
        field_data: [
          f("qual_carreira_você_quer_seguir?", "judiciária"),
          f("como_você_estuda_para_concursos_hoje?", "todos_os_dias"),
          f("quanto_tempo_por_dia_consegue_estudar?", "5h_ou_mais"),
          f("em_quanto_tempo_pretende_prestar_sua_prova?", "até_6_meses"),
        ],
      },
      "meta_form",
    );
    expect(r.horas_dia).toBe("5h_ou_mais");
    expect(r.prazo_prova).toBe("até_6_meses");
    expect(r.como_estuda).toBe("todos_os_dias");
    expect(r.pontuacao).toBe(12);
    expect(r.segmento).toBe("quente");
  });
});
