import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

const DIRETIVAS_VALIDAS = new Set(["legislacao", "atencao", "exemplo"]);
// :::legislacao sempre precisa de fonte/url; :::atencao aceita como opcionais
// (usada tambem em disciplinas sem legislacao/julgado a citar, ex.: Portugues,
// Matematica, Informatica, Analise de Dados — ali marca ponto critico de prova).
const DIRETIVAS_COM_FONTE_OBRIGATORIA = new Set(["legislacao"]);
const CAMPOS_OBRIGATORIOS = ["codigo", "disciplina", "materia", "titulo", "resumo", "tempo_leitura", "tags"];

function erro(msg) {
  console.error(`ERRO: ${msg}`);
  process.exit(1);
}

function parseFrontMatter(raw) {
  const m = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  if (!m) erro("front-matter YAML ausente ou mal formado (esperado bloco --- ... ---no topo)");
  const [, fmBlock, body] = m;
  const fm = {};
  for (const line of fmBlock.split(/\r?\n/)) {
    if (!line.trim()) continue;
    const kv = line.match(/^([a-zA-Z_]+):\s*(.*)$/);
    if (!kv) erro(`linha de front-matter invalida: "${line}"`);
    const [, key, rawValue] = kv;
    let value = rawValue.trim();
    if (value.startsWith("[") && value.endsWith("]")) {
      value = value
        .slice(1, -1)
        .split(",")
        .map((s) => s.trim().replace(/^["']|["']$/g, ""))
        .filter(Boolean);
    } else if (/^".*"$/.test(value) || /^'.*'$/.test(value)) {
      value = value.slice(1, -1);
    } else if (/^-?\d+$/.test(value)) {
      value = parseInt(value, 10);
    }
    fm[key] = value;
  }
  return { fm, body: body.replace(/^\r?\n/, "") };
}

function validarCamposObrigatorios(fm) {
  const faltando = CAMPOS_OBRIGATORIOS.filter((c) => fm[c] === undefined || fm[c] === "");
  if (faltando.length > 0) erro(`campos obrigatorios ausentes no front-matter: ${faltando.join(", ")}`);
}

function validarTitulos(body) {
  let dentroDeCodeFence = false;
  const linhas = body.split(/\r?\n/);
  linhas.forEach((linha, i) => {
    if (/^```/.test(linha.trim())) {
      dentroDeCodeFence = !dentroDeCodeFence;
      return;
    }
    if (dentroDeCodeFence) return;
    const h = linha.match(/^(#{1,6})\s/);
    if (h && h[1].length >= 4) {
      erro(`titulo H${h[1].length} nao permitido na linha ${i + 1}: "${linha.trim()}" (so H1, H2 e H3 sao aceitos)`);
    }
  });
}

function parseAtributos(linha) {
  const attrs = {};
  const re = /(\w+)="([^"]*)"/g;
  let m;
  while ((m = re.exec(linha))) attrs[m[1]] = m[2];
  return attrs;
}

function validarDiretivas(body) {
  const linhas = body.split(/\r?\n/);
  const pilha = [];
  let dentroDeCodeFence = false;
  linhas.forEach((linha, i) => {
    if (/^```/.test(linha.trim())) {
      dentroDeCodeFence = !dentroDeCodeFence;
      return;
    }
    if (dentroDeCodeFence) return;
    const trimmed = linha.trim();
    if (!trimmed.startsWith(":::")) return;

    if (trimmed === ":::") {
      if (pilha.length === 0) erro(`":::" de fechamento sem abertura correspondente na linha ${i + 1}`);
      pilha.pop();
      return;
    }

    // Sintaxe do remark-directive: atributos vao dentro de chaves,
    // ex.: :::legislacao{fonte="Lei nº 14.133/2021" url="https://..."}
    const abertura = trimmed.match(/^:::([a-zA-Z0-9_-]+)(\{[^}]*\})?\s*$/);
    if (!abertura) {
      erro(`linha de diretiva mal formada na linha ${i + 1}: "${trimmed}" (esperado :::nome ou :::nome{attr="valor"})`);
    }
    const nome = abertura[1];
    if (!DIRETIVAS_VALIDAS.has(nome)) {
      erro(`diretiva desconhecida ":::${nome}" na linha ${i + 1} (validas: legislacao, atencao, exemplo)`);
    }
    if (DIRETIVAS_COM_FONTE_OBRIGATORIA.has(nome)) {
      const attrs = parseAtributos(abertura[2] || "");
      if (!attrs.fonte || !attrs.url) {
        erro(`":::${nome}" na linha ${i + 1} precisa dos atributos fonte="..." e url="..." entre chaves`);
      }
    }
    pilha.push({ nome, linha: i + 1 });
  });
  if (pilha.length > 0) {
    erro(`diretiva(s) aberta(s) e nunca fechada(s): ${pilha.map((p) => `":::${p.nome}" (linha ${p.linha})`).join(", ")}`);
  }
}

const filePath = process.argv[2];
if (!filePath) erro("uso: node publish.mjs <caminho-do-markdown>");

const raw = readFileSync(filePath, "utf8");
const { fm, body } = parseFrontMatter(raw);

validarCamposObrigatorios(fm);
validarTitulos(body);
validarDiretivas(body);

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_PUBLISHABLE_KEY;
const EMAIL = process.env.ADMIN_SCRIPT_EMAIL;
const PASSWORD = process.env.ADMIN_SCRIPT_PASSWORD;
if (!SUPABASE_URL || !SUPABASE_KEY || !EMAIL || !PASSWORD) {
  erro("credenciais ausentes no ambiente (SUPABASE_URL / SUPABASE_PUBLISHABLE_KEY / ADMIN_SCRIPT_EMAIL / ADMIN_SCRIPT_PASSWORD)");
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
const { error: authError } = await supabase.auth.signInWithPassword({ email: EMAIL, password: PASSWORD });
if (authError) erro(`login falhou: ${authError.message}`);

const { data: disciplina, error: dErr } = await supabase
  .from("disciplinas")
  .select("id, codigo, slug, nome")
  .eq("codigo", fm.codigo)
  .maybeSingle();
if (dErr) erro(dErr.message);
if (!disciplina) erro(`codigo "${fm.codigo}" nao existe em disciplinas`);
if (disciplina.slug !== fm.disciplina) {
  erro(`front-matter diz disciplina="${fm.disciplina}", mas o codigo "${fm.codigo}" e da disciplina slug="${disciplina.slug}" (${disciplina.nome})`);
}

const { data: materiaExistente, error: mErr } = await supabase
  .from("materiais")
  .select("id, titulo, ordem")
  .eq("disciplina_id", disciplina.id)
  .eq("slug", fm.materia)
  .maybeSingle();
if (mErr) erro(mErr.message);

const payloadComum = {
  conteudo_md: body.trimEnd() + "\n",
  resumo: fm.resumo,
  tempo_leitura: fm.tempo_leitura,
  tags: fm.tags,
  publicado: true,
};

let materialId;
let acao;
let avisoForaDoSeed = false;
let novaOrdem;

if (materiaExistente) {
  const { data, error } = await supabase
    .from("materiais")
    .update(payloadComum)
    .eq("id", materiaExistente.id)
    .select("id")
    .single();
  if (error) erro(error.message);
  materialId = data.id;
  acao = "atualizado";
} else {
  const { data: maxOrdemRow } = await supabase
    .from("materiais")
    .select("ordem")
    .eq("disciplina_id", disciplina.id)
    .order("ordem", { ascending: false })
    .limit(1)
    .maybeSingle();
  novaOrdem = (maxOrdemRow?.ordem ?? 0) + 1;

  const { data, error } = await supabase
    .from("materiais")
    .insert({
      tipo: "markdown",
      titulo: fm.titulo,
      slug: fm.materia,
      disciplina_id: disciplina.id,
      modulo_id: null,
      ordem: novaOrdem,
      ...payloadComum,
    })
    .select("id")
    .single();
  if (error) erro(error.message);
  materialId = data.id;
  acao = "criado";
  avisoForaDoSeed = true;
}

console.log(`\n=== Publicacao concluida ===`);
console.log(`Acao: ${acao}`);
console.log(`Material id: ${materialId}`);
console.log(`Disciplina: ${fm.codigo} - ${disciplina.nome} (${disciplina.slug})`);
console.log(`Materia (slug): ${fm.materia}`);
console.log(`Link: /materiais/${materialId}/leitura`);
if (avisoForaDoSeed) {
  console.log(`\nAVISO: esta materia nao existia como placeholder do seed original.`);
  console.log(`Foi criada do zero, com ordem=${novaOrdem} (anexada ao final da disciplina).`);
}
