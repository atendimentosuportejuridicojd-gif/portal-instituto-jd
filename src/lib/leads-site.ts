/**
 * Formulário "Escolha sua carreira" do portal (mesmas perguntas e respostas do formulário da Meta).
 * Módulo puro (sem alias "@/" nem dependências de servidor): usado pela página e pela função de gravação.
 */
import { prepararLeadFormulario, type LinhaLead } from "./leads-meta";

export type PerguntaSite = {
  id: "carreira" | "como_estuda" | "horas_dia" | "prazo_prova";
  pergunta: string;
  opcoes: readonly string[];
};

// Os textos das respostas são os que a pontuação reconhece (ver PONTOS_* em leads-meta.ts).
export const PERGUNTAS_SITE: readonly PerguntaSite[] = [
  { id: "carreira", pergunta: "Qual carreira você quer seguir?", opcoes: ["Judiciária", "Fiscal", "Policial", "Ainda não defini"] },
  { id: "como_estuda", pergunta: "Como você estuda para concursos hoje?", opcoes: ["Todos os dias", "Algumas vezes por semana", "Só quando sai edital", "Ainda não comecei"] },
  { id: "horas_dia", pergunta: "Quanto tempo por dia consegue estudar?", opcoes: ["5h ou mais", "3 a 4h", "1 a 2h", "Menos de 1h"] },
  { id: "prazo_prova", pergunta: "Em quanto tempo pretende prestar sua prova?", opcoes: ["Até 6 meses", "6 a 12 meses", "Mais de 1 ano", "Sem prazo definido"] },
];

export type RespostasSite = {
  nome: string;
  email: string;
  telefone: string;
  carreira: string;
  como_estuda: string;
  horas_dia: string;
  prazo_prova: string;
  gclid?: string | null;
};

/** Converte as respostas do formulário na linha de leads_diagnostico (origem "site_form"). */
export function montarLinhaSite(r: RespostasSite): LinhaLead {
  const campos = [
    { name: "Nome completo", values: [r.nome] },
    { name: "E-mail", values: [r.email] },
    { name: "Telefone (WhatsApp)", values: [r.telefone] },
    ...PERGUNTAS_SITE.map((p) => ({ name: p.pergunta, values: [r[p.id]] })),
  ];
  const linha = prepararLeadFormulario(
    { id: "site", field_data: campos, consentimento: true },
    "site_form",
    { campos },
  );
  // Sem id externo: meta_lead_id fica NULL (a restrição UNIQUE ignora NULL).
  return { ...linha, meta_lead_id: null, gclid: r.gclid ?? null };
}
