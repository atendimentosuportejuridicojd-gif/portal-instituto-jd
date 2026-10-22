/**
 * Pontuação e normalização dos leads de formulários instantâneos ("Formulário Carreira 360").
 * Módulo puro (sem alias "@/" nem dependências): usado pela rota do webhook e pelo
 * script scripts/import_leads_meta.mjs.
 *
 * Duas camadas:
 *  - núcleo, independente da origem: normalizarTexto, normalizarTelefone, pontuação e
 *    prepararLeadFormulario (recebe a origem). Serve a qualquer formulário com as mesmas 4 perguntas.
 *  - adaptador da Meta: prepararLeadMeta lê o formato da Graph API (field_data e
 *    custom_disclaimer_responses) e chama o núcleo com origem "meta_form".
 */

export type Segmento = "quente" | "morno" | "frio";
export type OrigemFormulario = "meta_form" | "google_form";

export type CampoFormulario = { name: string; values?: string[] };

// Chaves já normalizadas (ver normalizarTexto). O formulário pode devolver o rótulo ou o valor em snake_case.
const PONTOS_CARREIRA: Record<string, number> = {
  judiciaria: 3,
  fiscal: 3,
  policial: 3,
  "ainda nao defini": 0,
};
const PONTOS_ESTUDO: Record<string, number> = {
  "todos os dias": 3,
  "algumas vezes por semana": 2,
  "so quando sai edital": 1,
  "ainda nao comecei": 0,
};
const PONTOS_HORAS: Record<string, number> = {
  "5h ou mais": 3,
  "3 a 4h": 2,
  "1 a 2h": 1,
  "menos de 1h": 0,
};
const PONTOS_PRAZO: Record<string, number> = {
  "ate 6 meses": 3,
  "6 a 12 meses": 2,
  "mais de 1 ano": 1,
  "sem prazo definido": 0,
};

/** Minúsculas, sem acento, underline e pontuação viram espaço. "Até_6_meses" -> "ate 6 meses". */
export function normalizarTexto(valor: string): string {
  return valor
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/** "5 h ou mais" e "5h ou mais" devem dar a mesma chave. */
function chaveResposta(valor: string): string {
  return normalizarTexto(valor).replace(/(\d) h\b/g, "$1h");
}

/** Tira o prefixo "l:" que o CSV da Meta põe no id, para casar com o leadgen_id do webhook. */
export function normalizarIdLead(id: unknown): string {
  return String(id ?? "").trim().replace(/^l:/i, "");
}

function pontuar(rotulo: string, valor: string | null, tabela: Record<string, number>, avisos: string[]): number {
  if (!valor) return 0; // o aviso de campo ausente já foi registrado (com os nomes das chaves recebidas)
  const pontos = tabela[chaveResposta(valor)];
  if (pontos === undefined) {
    avisos.push(`${rotulo}: resposta desconhecida (0 pontos)`);
    return 0;
  }
  return pontos;
}

export function segmentoPorPontuacao(total: number): Segmento {
  return total >= 9 ? "quente" : total >= 5 ? "morno" : "frio";
}

/** Devolve +55DDDNÚMERO ou null se não parecer um telefone brasileiro. */
export function normalizarTelefone(bruto: string | null | undefined): string | null {
  let d = (bruto ?? "").replace(/\D/g, "");
  if (d.startsWith("00")) d = d.slice(2);
  if (d.length === 10 || d.length === 11) d = `55${d}`;
  if (!(d.startsWith("55") && (d.length === 12 || d.length === 13))) return null;
  return `+${d}`;
}

function valorDoCampo(campos: CampoFormulario[], achar: (chave: string) => boolean): string | null {
  const campo = campos.find((c) => achar(normalizarTexto(c.name)));
  const valor = campo?.values?.[0];
  return typeof valor === "string" && valor.trim() ? valor.trim() : null;
}

export type LinhaLead = {
  origem: OrigemFormulario;
  meta_lead_id: string | null;
  google_lead_id?: string;
  gclid?: string | null;
  nome: string;
  email: string | null;
  telefone: string | null;
  carreira: string | null;
  como_estuda: string | null;
  horas_dia: string | null;
  prazo_prova: string | null;
  pontuacao: number;
  segmento: Segmento;
  form_id: string | null;
  ad_id: string | null;
  adgroup_id: string | null;
  campanha: string | null;
  consentimento: boolean | null;
  payload_bruto: unknown;
  avisos: string[];
  criado_em?: string;
};

export type EntradaFormulario = {
  id: string;
  created_time?: string | null;
  field_data: CampoFormulario[];
  consentimento?: boolean | null;
  form_id?: string | null;
  ad_id?: string | null;
  adgroup_id?: string | null;
  campanha?: string | null;
};

/**
 * Núcleo: acha os campos pelo nome da pergunta (carreira, estud*, hora*, prazo), pontua e segmenta.
 * Nunca lança por campo faltando: grava o que houver e registra avisos. Os avisos de campo não
 * encontrado listam só os NOMES das chaves recebidas, nunca os valores (dado pessoal).
 */
export function prepararLeadFormulario(
  entrada: EntradaFormulario,
  origem: OrigemFormulario,
  payloadBruto?: unknown,
): LinhaLead {
  const campos = entrada.field_data ?? [];
  const avisos: string[] = [];
  const chavesRecebidas = campos.map((c) => c.name).join(", ") || "nenhuma";

  const achar = (rotulo: string, pred: (k: string) => boolean) => {
    const valor = valorDoCampo(campos, pred);
    if (valor === null) avisos.push(`${rotulo}: campo não encontrado (chaves recebidas: ${chavesRecebidas})`);
    return valor;
  };

  // Ordem importa: horas/prazo antes de "estud", pois "quanto tempo por dia consegue estudar" contém "estud".
  const ehHoras = (k: string) => k.includes("hora") || (k.includes("tempo") && k.includes("dia"));
  const ehPrazo = (k: string) => k.includes("prazo") || k.includes("prova") || k.includes("prestar");
  const carreira = achar("carreira", (k) => k.includes("carreira"));
  const horasDia = achar("horas_dia", (k) => ehHoras(k));
  const prazoProva = achar("prazo_prova", (k) => !ehHoras(k) && ehPrazo(k));
  const comoEstuda = achar("como_estuda", (k) => k.includes("estud") && !ehHoras(k) && !ehPrazo(k) && !k.includes("carreira"));

  const pontuacao =
    pontuar("carreira", carreira, PONTOS_CARREIRA, avisos) +
    pontuar("como_estuda", comoEstuda, PONTOS_ESTUDO, avisos) +
    pontuar("horas_dia", horasDia, PONTOS_HORAS, avisos) +
    pontuar("prazo_prova", prazoProva, PONTOS_PRAZO, avisos);

  const telefoneBruto = valorDoCampo(campos, (k) => k === "phone number" || k.includes("telefone") || k.includes("phone"));
  const telefone = normalizarTelefone(telefoneBruto);
  if (!telefoneBruto) avisos.push(`telefone: campo não encontrado (chaves recebidas: ${chavesRecebidas})`);
  else if (!telefone) avisos.push("telefone: formato inválido (não gravado)");

  const criado = entrada.created_time ? new Date(entrada.created_time) : null;

  return {
    origem,
    meta_lead_id: normalizarIdLead(entrada.id),
    nome: valorDoCampo(campos, (k) => k === "full name" || k === "nome" || k.includes("nome")) ?? "(sem nome)",
    email: valorDoCampo(campos, (k) => k === "email" || k.includes("e mail")),
    telefone,
    carreira,
    como_estuda: comoEstuda,
    horas_dia: horasDia,
    prazo_prova: prazoProva,
    pontuacao,
    segmento: segmentoPorPontuacao(pontuacao),
    form_id: entrada.form_id ? String(entrada.form_id) : null,
    ad_id: entrada.ad_id ? String(entrada.ad_id) : null,
    adgroup_id: entrada.adgroup_id ? String(entrada.adgroup_id) : null,
    campanha: entrada.campanha ?? null,
    consentimento: entrada.consentimento ?? null,
    payload_bruto: payloadBruto ?? entrada,
    avisos,
    ...(criado && !Number.isNaN(criado.getTime()) ? { criado_em: criado.toISOString() } : {}),
  };
}

// ── Adaptador da Meta ─────────────────────────────────────────────────────────

export type RespostaDisclaimer = { checkbox_key?: string; is_checked?: unknown };

/**
 * custom_disclaimer_responses da Graph API: true se alguma caixa veio marcada, false se há caixas e
 * nenhuma marcada, null se o formulário não tem caixa.
 */
export function consentimentoDeDisclaimer(respostas: RespostaDisclaimer[] | null | undefined): boolean | null {
  if (!Array.isArray(respostas) || respostas.length === 0) return null;
  return respostas.some((r) => r?.is_checked === true || r?.is_checked === 1 || r?.is_checked === "1" || r?.is_checked === "true");
}

export type LeadGraph = {
  id: string;
  created_time?: string | null;
  field_data?: CampoFormulario[];
  custom_disclaimer_responses?: RespostaDisclaimer[];
};

/** Ids vindos da notificação do webhook (value do change "leadgen"), não da Graph API. */
export type IdsNotificacao = { form_id?: unknown; ad_id?: unknown; adgroup_id?: unknown };

export function prepararLeadMeta(lead: LeadGraph, ids: IdsNotificacao = {}, payloadBruto?: unknown): LinhaLead {
  const texto = (v: unknown) => (v === undefined || v === null || v === "" ? null : String(v));
  return prepararLeadFormulario(
    {
      id: lead.id,
      created_time: lead.created_time,
      field_data: lead.field_data ?? [],
      consentimento: consentimentoDeDisclaimer(lead.custom_disclaimer_responses),
      form_id: texto(ids.form_id),
      ad_id: texto(ids.ad_id),
      adgroup_id: texto(ids.adgroup_id),
    },
    "meta_form",
    payloadBruto ?? lead,
  );
}
