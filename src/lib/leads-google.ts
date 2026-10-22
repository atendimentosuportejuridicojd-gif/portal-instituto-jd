/**
 * Adaptador do webhook de formulário de lead do Google Ads: converte o payload (WebhookLead) para
 * o núcleo de src/lib/leads-meta.ts. Módulo puro, sem alias "@/".
 */
import { prepararLeadFormulario, type CampoFormulario, type LinhaLead } from "./leads-meta";

export type ColunaGoogle = { column_id?: string; column_name?: string; string_value?: string };

export type LeadGoogle = {
  lead_id?: string;
  user_column_data?: ColunaGoogle[];
  form_id?: string | number;
  campaign_id?: string | number;
  adgroup_id?: string | number;
  gcl_id?: string;
  google_key?: string;
  is_test?: boolean;
  lead_submit_time?: string;
};

const texto = (v: unknown) => (v === undefined || v === null || v === "" ? null : String(v));

/**
 * Cada resposta vira um campo pelo column_id (FULL_NAME, EMAIL, PHONE_NUMBER) e outro pelo
 * column_name (rótulo da pergunta personalizada, hoje "deprecated" mas ainda enviado). O núcleo
 * acha o primeiro que casar, então perguntas com id opaco continuam pontuando pelo rótulo.
 */
export function camposDoGoogle(colunas: ColunaGoogle[] | undefined): CampoFormulario[] {
  const campos: CampoFormulario[] = [];
  for (const c of colunas ?? []) {
    const valor = c?.string_value;
    if (typeof valor !== "string" || !valor.trim()) continue;
    for (const nome of new Set([c.column_id, c.column_name])) {
      if (nome) campos.push({ name: nome, values: [valor] });
    }
  }
  return campos;
}

/** O payload traz a chave de validação: ela nunca vai para o banco. */
export function semChave(lead: LeadGoogle): Omit<LeadGoogle, "google_key"> {
  const { google_key: _chave, ...resto } = lead;
  return resto;
}

export function prepararLeadGoogle(lead: LeadGoogle): LinhaLead {
  const id = String(lead.lead_id ?? "").trim();
  const linha = prepararLeadFormulario(
    {
      id,
      created_time: lead.lead_submit_time ?? null,
      field_data: camposDoGoogle(lead.user_column_data),
      consentimento: null, // o formulário do Google não devolve caixas de consentimento
      form_id: texto(lead.form_id),
      adgroup_id: texto(lead.adgroup_id),
    },
    "google_form",
    semChave(lead),
  );
  if (lead.is_test === true) linha.avisos.push("lead de teste do Google (is_test)");
  // Idempotência pelo google_lead_id; meta_lead_id fica NULL (a restrição UNIQUE ignora NULL).
  return { ...linha, meta_lead_id: null, google_lead_id: id, gclid: texto(lead.gcl_id) };
}
