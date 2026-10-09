/**
 * Motor do cronograma J&D: função pura (sem banco, sem tela) que distribui o estudo no calendário.
 *
 * Método J&D aplicado aqui:
 * - uma disciplina por vez, matéria por matéria (leitura + questões comentadas);
 * - ao fim de cada disciplina, um bloco de REVISÃO. O conteúdo dele NÃO é decidido aqui: no dia, o
 *   sistema lista as matérias abaixo da meta de desempenho (85%) da disciplina concluída e das
 *   anteriores. O motor só reserva o tempo estimado (reservaRevisao) desse bloco;
 * - do início até um dia antes da prova; as últimas ~2 semanas (fase final) só são reservadas se o
 *   estudo e as revisões terminarem antes delas;
 * - simulados opcionais (serviço à parte) a cada 15 dias a partir da data de início.
 */

export const META_DESEMPENHO = 85;
export const MINUTOS_POR_QUESTAO_PADRAO = 3;
export const RESERVA_REVISAO_PADRAO = 0.25;
export const DIAS_FASE_FINAL = 13;
export const INTERVALO_SIMULADO_DIAS = 15;
/** Menor pedaço de bloco que vale colocar num dia; abaixo disso o resto vai para o dia seguinte. */
const MIN_PEDACO = 10;

export type TipoBloco = "estudo" | "questoes" | "revisao" | "fase_final" | "simulado";

export interface MateriaPlano {
  id: string;
  titulo: string;
  /** Minutos de leitura (materiais.tempo_leitura). */
  minutosLeitura: number;
  /** Quantidade de questões para estimar o tempo (real, ou já estimada pela média da disciplina). */
  qtdQuestoes: number;
}

export interface DisciplinaPlano {
  id: string;
  nome: string;
  /** Matérias na ordem em que serão estudadas. */
  materias: MateriaPlano[];
}

export interface ParametrosPlano {
  /** YYYY-MM-DD */
  dataInicio: string;
  /** YYYY-MM-DD: o plano termina um dia antes. */
  dataProva: string;
  /** Minutos disponíveis por dia da semana: índice 0 = domingo ... 6 = sábado. */
  minutosPorDiaSemana: [number, number, number, number, number, number, number];
  /** Disciplinas na ordem de estudo. */
  disciplinas: DisciplinaPlano[];
  minutosPorQuestao?: number;
  reservaRevisao?: number;
  /** Se o aluno contratou os simulados. */
  simulados?: boolean;
  /** Duração de cada simulado em minutos (total de questões da prova × minutos por questão). */
  minutosSimulado?: number;
}

export interface BlocoPlano {
  data: string;
  tipo: TipoBloco;
  disciplinaId: string | null;
  materiaId: string | null;
  titulo: string;
  minutos: number;
  /** Posição dentro do dia (0, 1, 2…). */
  ordem: number;
  /** Pedaço de um bloco maior que foi dividido entre dias. */
  continuacao: boolean;
}

export interface ResultadoPlano {
  blocos: BlocoPlano[];
  /** true se todo o estudo e as revisões couberam antes da prova. */
  cabe: boolean;
  /** Minutos que ficaram de fora (0 quando cabe). */
  faltamMinutos: number;
  minutosNecessarios: number;
  minutosDisponiveis: number;
  diasDisponiveis: number;
  /** Último dia com estudo/revisão (null se não houver nada a estudar). */
  fimEstudo: string | null;
  /** Período reservado para a fase final, quando coube. */
  faseFinal: { inicio: string; fim: string } | null;
  simulados: string[];
}

// ---------- datas (strings YYYY-MM-DD, sem fuso) ----------

function paraUtc(iso: string): number {
  const [a, m, d] = iso.split("-").map(Number);
  return Date.UTC(a, m - 1, d);
}

function deUtc(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10);
}

export function somarDias(iso: string, dias: number): string {
  return deUtc(paraUtc(iso) + dias * 86_400_000);
}

export function diferencaDias(deIso: string, ateIso: string): number {
  return Math.round((paraUtc(ateIso) - paraUtc(deIso)) / 86_400_000);
}

function diaDaSemana(iso: string): number {
  return new Date(paraUtc(iso)).getUTCDay();
}

// ---------- motor ----------

interface ItemTrabalho {
  tipo: "estudo" | "questoes" | "revisao";
  disciplinaId: string;
  materiaId: string | null;
  titulo: string;
  minutos: number;
}

/** Quantos minutos o plano precisa para estudar tudo, com a reserva das revisões. */
function montarItens(p: ParametrosPlano): ItemTrabalho[] {
  const minQ = p.minutosPorQuestao ?? MINUTOS_POR_QUESTAO_PADRAO;
  const reserva = p.reservaRevisao ?? RESERVA_REVISAO_PADRAO;
  const itens: ItemTrabalho[] = [];

  for (const d of p.disciplinas) {
    let totalDisciplina = 0;
    for (const m of d.materias) {
      const leitura = Math.max(0, Math.round(m.minutosLeitura));
      const questoes = Math.max(0, Math.round(m.qtdQuestoes * minQ));
      if (leitura > 0) {
        itens.push({ tipo: "estudo", disciplinaId: d.id, materiaId: m.id, titulo: m.titulo, minutos: leitura });
      }
      if (questoes > 0) {
        itens.push({ tipo: "questoes", disciplinaId: d.id, materiaId: m.id, titulo: m.titulo, minutos: questoes });
      }
      totalDisciplina += leitura + questoes;
    }
    const minutosRevisao = Math.round(totalDisciplina * reserva);
    if (minutosRevisao > 0) {
      itens.push({
        tipo: "revisao",
        disciplinaId: d.id,
        materiaId: null,
        titulo: `Revisão — ${d.nome}`,
        minutos: minutosRevisao,
      });
    }
  }
  return itens;
}

export function gerarPlano(p: ParametrosPlano): ResultadoPlano {
  const ultimoDia = somarDias(p.dataProva, -1);
  const totalDias = Math.max(0, diferencaDias(p.dataInicio, ultimoDia) + 1);
  const itens = montarItens(p);
  const minutosNecessarios = itens.reduce((acc, i) => acc + i.minutos, 0);

  // Simulados: reservam tempo nos dias em que caem.
  const datasSimulado: string[] = [];
  if (p.simulados && (p.minutosSimulado ?? 0) > 0) {
    for (let d = 0; d < totalDias; d += INTERVALO_SIMULADO_DIAS) datasSimulado.push(somarDias(p.dataInicio, d));
  }
  const simuladoNoDia = new Map<string, number>(datasSimulado.map((d) => [d, p.minutosSimulado ?? 0]));

  const capacidade = (data: string) => {
    const base = p.minutosPorDiaSemana[diaDaSemana(data)] ?? 0;
    return Math.max(0, base - (simuladoNoDia.get(data) ?? 0));
  };

  const dias: string[] = [];
  for (let i = 0; i < totalDias; i++) dias.push(somarDias(p.dataInicio, i));

  // A fase final só é reservada se o estudo terminar até D-14. Testo com a capacidade dos dias anteriores.
  const diasAntesDaFase = dias.filter((d) => diferencaDias(d, p.dataProva) > DIAS_FASE_FINAL);
  const capacidadeAntesDaFase = diasAntesDaFase.reduce((acc, d) => acc + capacidade(d), 0);
  const reservaFaseFinal = totalDias > DIAS_FASE_FINAL && minutosNecessarios <= capacidadeAntesDaFase;
  const diasDeEstudo = reservaFaseFinal ? diasAntesDaFase : dias;
  const minutosDisponiveis = diasDeEstudo.reduce((acc, d) => acc + capacidade(d), 0);

  // Distribuição sequencial, dividindo blocos entre dias quando preciso.
  const blocos: BlocoPlano[] = [];
  let idxItem = 0;
  let restoItem = itens[0]?.minutos ?? 0;
  let itemDividido = false;
  let fimEstudo: string | null = null;

  for (const data of diasDeEstudo) {
    let sobra = capacidade(data);
    let ordem = 0;
    while (idxItem < itens.length && sobra >= Math.min(MIN_PEDACO, restoItem)) {
      const item = itens[idxItem];
      const pedaco = Math.min(restoItem, sobra);
      blocos.push({
        data,
        tipo: item.tipo,
        disciplinaId: item.disciplinaId,
        materiaId: item.materiaId,
        titulo: item.titulo,
        minutos: pedaco,
        ordem: ordem++,
        continuacao: itemDividido,
      });
      fimEstudo = data;
      sobra -= pedaco;
      restoItem -= pedaco;
      if (restoItem <= 0) {
        idxItem++;
        restoItem = itens[idxItem]?.minutos ?? 0;
        itemDividido = false;
      } else {
        itemDividido = true;
      }
    }
    if (idxItem >= itens.length) break;
  }

  const faltamMinutos =
    idxItem >= itens.length ? 0 : restoItem + itens.slice(idxItem + 1).reduce((acc, i) => acc + i.minutos, 0);

  // Fase final: um bloco por dia (conteúdo a definir), com a capacidade do dia.
  let faseFinal: ResultadoPlano["faseFinal"] = null;
  if (reservaFaseFinal) {
    const diasFase = dias.filter((d) => diferencaDias(d, p.dataProva) <= DIAS_FASE_FINAL);
    if (diasFase.length) {
      faseFinal = { inicio: diasFase[0], fim: diasFase[diasFase.length - 1] };
      for (const data of diasFase) {
        const cap = capacidade(data);
        if (cap <= 0) continue;
        blocos.push({
          data,
          tipo: "fase_final",
          disciplinaId: null,
          materiaId: null,
          titulo: "Fase final — desempenho completo",
          minutos: cap,
          ordem: 0,
          continuacao: false,
        });
      }
    }
  }

  // Simulados entram no início de cada dia em que caem.
  for (const data of datasSimulado) {
    for (const b of blocos) if (b.data === data) b.ordem += 1;
    blocos.push({
      data,
      tipo: "simulado",
      disciplinaId: null,
      materiaId: null,
      titulo: "Simulado",
      minutos: p.minutosSimulado ?? 0,
      ordem: 0,
      continuacao: false,
    });
  }

  blocos.sort((a, b) => (a.data === b.data ? a.ordem - b.ordem : a.data < b.data ? -1 : 1));

  return {
    blocos,
    cabe: faltamMinutos === 0,
    faltamMinutos,
    minutosNecessarios,
    minutosDisponiveis,
    diasDisponiveis: totalDias,
    fimEstudo,
    faseFinal,
    simulados: datasSimulado,
  };
}
