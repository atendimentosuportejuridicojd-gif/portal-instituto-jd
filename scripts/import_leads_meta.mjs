/**
 * Plano B: importa o CSV de leads baixado do Gerenciador de Anúncios / Leads Center da Meta.
 * Passa pela mesma pontuação do webhook (src/lib/leads-meta.ts) e grava com upsert por meta_lead_id,
 * então reimportar o mesmo arquivo (ou um que já chegou pelo webhook) não duplica.
 *
 * Uso:
 *   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... \
 *   bun scripts/import_leads_meta.mjs <arquivo.csv> [--dry-run]
 *
 * Não imprime dado pessoal: só contagens e os ids dos leads com avisos.
 */
import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";
import { normalizarTexto, prepararLeadFormulario } from "../src/lib/leads-meta.ts";

const arquivo = process.argv[2];
const dryRun = process.argv.includes("--dry-run");
if (!arquivo) throw new Error("Informe o arquivo CSV.");

// A Meta costuma exportar em UTF-16 LE com tabulação; aceitamos também UTF-8 com , ou ;.
const bytes = readFileSync(arquivo);
let conteudo = bytes[0] === 0xff && bytes[1] === 0xfe ? bytes.toString("utf16le") : bytes.toString("utf8");
conteudo = conteudo.replace(/^﻿/, "");

const primeiraLinha = conteudo.split(/\r?\n/, 1)[0];
const delimitador = ["\t", ";", ","].sort(
  (a, b) => primeiraLinha.split(b).length - primeiraLinha.split(a).length,
)[0];

function lerCsv(texto, sep) {
  const linhas = [];
  let campo = "";
  let linha = [];
  let aspas = false;
  for (let i = 0; i < texto.length; i++) {
    const c = texto[i];
    if (aspas) {
      if (c === '"' && texto[i + 1] === '"') { campo += '"'; i++; }
      else if (c === '"') aspas = false;
      else campo += c;
    } else if (c === '"') aspas = true;
    else if (c === sep) { linha.push(campo); campo = ""; }
    else if (c === "\n" || c === "\r") {
      if (c === "\r" && texto[i + 1] === "\n") i++;
      linha.push(campo); campo = "";
      if (linha.some((v) => v !== "")) linhas.push(linha);
      linha = [];
    } else campo += c;
  }
  linha.push(campo);
  if (linha.some((v) => v !== "")) linhas.push(linha);
  return linhas;
}

const [cabecalho, ...registros] = lerCsv(conteudo, delimitador);
const colunas = cabecalho.map((c) => c.trim());
// Colunas de metadados da Meta; todas as outras são perguntas do formulário.
const METADADOS = new Set(
  ["id", "created_time", "ad_id", "ad_name", "adset_id", "adset_name", "campaign_id", "campaign_name",
   "form_id", "form_name", "is_organic", "platform", "lead_status"],
);

const linhas = registros.map((r) => {
  const porColuna = Object.fromEntries(colunas.map((c, i) => [c, (r[i] ?? "").trim()]));
  const field_data = colunas
    .filter((c) => !METADADOS.has(normalizarTexto(c).replace(/ /g, "_")) && porColuna[c])
    .map((c) => ({ name: c, values: [porColuna[c]] }));
  // O id do CSV vem como "l:123..."; prepararLeadFormulario remove o prefixo para casar com o leadgen_id do webhook.
  // O CSV não traz as caixas de consentimento (custom_disclaimer_responses): consentimento fica NULL.
  const linha = prepararLeadFormulario(
    {
      id: porColuna.id,
      created_time: porColuna.created_time || null,
      field_data,
      form_id: porColuna.form_id || null,
      ad_id: porColuna.ad_id || null,
      campanha: porColuna.campaign_name || null,
    },
    "meta_form",
    porColuna,
  );
  return linha;
}).filter((l) => l.meta_lead_id);

const comAviso = linhas.filter((l) => l.avisos.length > 0);
const porSegmento = { quente: 0, morno: 0, frio: 0 };
for (const l of linhas) porSegmento[l.segmento]++;

console.log(`${linhas.length} leads lidos | quentes ${porSegmento.quente}, mornos ${porSegmento.morno}, frios ${porSegmento.frio}`);
console.log(`${comAviso.length} com aviso${comAviso.length ? ": " + comAviso.map((l) => `${l.meta_lead_id} (${l.avisos.length})`).join(", ") : ""}`);

if (dryRun) {
  console.log("--dry-run: nada foi gravado.");
} else {
  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  });
  for (let i = 0; i < linhas.length; i += 100) {
    const { error } = await supabase
      .from("leads_diagnostico")
      .upsert(linhas.slice(i, i + 100), { onConflict: "meta_lead_id" });
    if (error) throw new Error(`Falha ao gravar o lote ${i / 100 + 1}: ${error.message}`);
  }
  console.log("Importação concluída.");
}
