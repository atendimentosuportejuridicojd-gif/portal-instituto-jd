import { createClient } from "@supabase/supabase-js";
import { writeFileSync } from "node:fs";

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_PUBLISHABLE_KEY;
const EMAIL = process.env.ADMIN_SCRIPT_EMAIL;
const PASSWORD = process.env.ADMIN_SCRIPT_PASSWORD;

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
const { data: auth, error: authError } = await supabase.auth.signInWithPassword({
  email: EMAIL,
  password: PASSWORD,
});
if (authError) throw authError;
console.error("logado como", auth.user.email);

function sqlLiteral(v) {
  if (v === null || v === undefined) return "NULL";
  if (typeof v === "boolean") return v ? "true" : "false";
  if (typeof v === "number") return String(v);
  if (Array.isArray(v)) {
    const inner = v
      .map((x) => `"${String(x).replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`)
      .join(",");
    return `'{${inner}}'`;
  }
  return `'${String(v).replace(/'/g, "''")}'`;
}

function toInsert(table, columns, row) {
  const values = columns.map((c) => sqlLiteral(row[c])).join(", ");
  return `INSERT INTO public.${table} (${columns.join(", ")}) VALUES (${values});`;
}

async function fetchAll(table, filterFn, pageSize = 1000) {
  const rows = [];
  let from = 0;
  for (;;) {
    let q = supabase.from(table).select("*").range(from, from + pageSize - 1);
    if (filterFn) q = filterFn(q);
    const { data, error } = await q;
    if (error) throw error;
    rows.push(...data);
    if (data.length < pageSize) break;
    from += pageSize;
  }
  return rows;
}

async function fetchInChunks(table, column, ids, chunkSize = 50) {
  if (ids.length === 0) return [];
  const rows = [];
  for (let i = 0; i < ids.length; i += chunkSize) {
    const chunk = ids.slice(i, i + chunkSize);
    const part = await fetchAll(table, (q) => q.in(column, chunk));
    rows.push(...part);
  }
  return rows;
}

async function fetchInChunksEither(table, columnA, idsA, columnB, idsB, chunkSize = 50) {
  const byId = new Map();
  for (const r of await fetchInChunks(table, columnA, idsA, chunkSize)) byId.set(r.id, r);
  for (const r of await fetchInChunks(table, columnB, idsB, chunkSize)) byId.set(r.id, r);
  return [...byId.values()];
}

// 1) Disciplina
const { data: disciplina, error: dErr } = await supabase
  .from("disciplinas")
  .select("*")
  .eq("slug", "tecnico-legislativo")
  .is("codigo", null)
  .single();
if (dErr) throw dErr;
console.error("disciplina:", disciplina.id, disciplina.nome);

const discId = disciplina.id;

// 2) Modulos
const modulos = await fetchAll("modulos", (q) => q.eq("disciplina_id", discId));

// 3) Materiais
const materiais = await fetchAll("materiais", (q) => q.eq("disciplina_id", discId));
const matIds = materiais.map((m) => m.id);

// 4) Questoes (via material_id OU disciplina_id direto sem material)
const questoesPorMaterial = await fetchInChunks("questoes", "material_id", matIds);
const { data: questoesSemMaterial, error: qsmErr } = await supabase
  .from("questoes")
  .select("*")
  .eq("disciplina_id", discId)
  .is("material_id", null);
if (qsmErr) throw qsmErr;
const questoesMap = new Map();
for (const q of [...questoesPorMaterial, ...(questoesSemMaterial || [])]) questoesMap.set(q.id, q);
const questoes = [...questoesMap.values()];
const qIds = questoes.map((q) => q.id);

// 5) Alternativas
const alternativas = await fetchInChunks("questao_alternativas", "questao_id", qIds);

// 6) Sessoes (por material_id)
const sessoes = await fetchInChunks("questao_sessoes", "material_id", matIds);
const sessIds = sessoes.map((s) => s.id);

// 7) Tentativas (por questao_id OU sessao_id)
const tentativas = await fetchInChunksEither(
  "questao_tentativas",
  "questao_id",
  qIds,
  "sessao_id",
  sessIds,
);

// 8) Vinculos
const trilhaMateriais = await fetchInChunks("trilha_materiais", "material_id", matIds);
const concursoMateriais = await fetchInChunks("concurso_materiais", "material_id", matIds);

// 9) Versoes
const materialVersoes = await fetchInChunks("material_versoes", "material_id", matIds);

const cols = {
  disciplinas: [
    "id", "nome", "slug", "descricao", "ordem", "created_at", "updated_at",
    "especifica", "concurso_id", "grupo", "protegida", "codigo",
  ],
  modulos: ["id", "disciplina_id", "nome", "descricao", "ordem", "created_at", "updated_at", "slug"],
  materiais: [
    "id", "titulo", "descricao", "disciplina_id", "modulo_id", "arquivo_url", "paginas", "tags",
    "publicado", "created_at", "updated_at", "versao", "publicado_em", "atualizado_em",
    "storage_path", "ordem", "download_permitido", "tamanho_bytes",
  ],
  questoes: [
    "id", "enunciado", "disciplina_id", "banca", "ano", "orgao", "nivel", "comentario_professor",
    "publicado", "created_at", "updated_at", "material_id", "referencia", "ordem", "anulada",
  ],
  questao_alternativas: ["id", "questao_id", "letra", "texto", "correta", "ordem"],
  questao_sessoes: [
    "id", "user_id", "material_id", "status", "total_questoes", "acertos", "erros",
    "percentual", "iniciada_em", "concluida_em", "created_at", "updated_at",
  ],
  questao_tentativas: ["id", "user_id", "questao_id", "alternativa_id", "acertou", "created_at", "sessao_id"],
  trilha_materiais: ["trilha_id", "material_id", "ordem"],
  concurso_materiais: ["concurso_id", "material_id", "exclusivo", "ordem"],
  material_versoes: ["id", "material_id", "versao", "arquivo_url", "notas", "created_by", "storage_path", "created_at"],
};

const parts = [];
parts.push(`-- Backup completo de "Tecnico Legislativo" antes da exclusao definitiva.`);
parts.push(`-- Gerado em ${new Date().toISOString()}.`);
parts.push(`-- Disciplina id: ${discId}`);
parts.push(`-- Ordem de restauracao: da raiz para as folhas (inverso da exclusao).`);
parts.push(`-- Restaurar com: psql (ou supabase db) < este arquivo, dentro de uma transacao.`);
parts.push("");
parts.push("BEGIN;");
parts.push("");

function section(title, table, rows) {
  parts.push(`-- ${title}: ${rows.length} registro(s)`);
  for (const row of rows) parts.push(toInsert(table, cols[table], row));
  parts.push("");
}

section("1) disciplinas", "disciplinas", [disciplina]);
section("2) modulos", "modulos", modulos);
section("3) materiais", "materiais", materiais);
section("4) questoes", "questoes", questoes);
section("5) questao_alternativas", "questao_alternativas", alternativas);
section("6) questao_sessoes", "questao_sessoes", sessoes);
section("7) questao_tentativas", "questao_tentativas", tentativas);
section("8) trilha_materiais", "trilha_materiais", trilhaMateriais);
section("9) concurso_materiais", "concurso_materiais", concursoMateriais);
section("10) material_versoes", "material_versoes", materialVersoes);

parts.push("COMMIT;");
parts.push("");

const yyyy = new Date().getFullYear();
const mm = String(new Date().getMonth() + 1).padStart(2, "0");
const dd = String(new Date().getDate()).padStart(2, "0");
const outPath = `scripts/backup/tecnico-legislativo-${yyyy}${mm}${dd}.sql`;
writeFileSync(outPath, parts.join("\n"), "utf8");

console.error("\n=== Resumo do backup ===");
console.error("arquivo:", outPath);
console.error("disciplinas:", 1);
console.error("modulos:", modulos.length);
console.error("materiais:", materiais.length);
console.error("questoes:", questoes.length);
console.error("questao_alternativas:", alternativas.length);
console.error("questao_sessoes:", sessoes.length);
console.error("questao_tentativas:", tentativas.length);
console.error("trilha_materiais:", trilhaMateriais.length);
console.error("concurso_materiais:", concursoMateriais.length);
console.error("material_versoes:", materialVersoes.length);
console.error("storage_paths (materiais):", materiais.filter((m) => m.storage_path).length);

// Lista os storage_path para o PASSO 2 (exclusao no Storage)
writeFileSync(
  "scripts/backup/tecnico-legislativo-storage-paths.json",
  JSON.stringify(
    {
      materiais: materiais.filter((m) => m.storage_path).map((m) => m.storage_path),
      material_versoes: materialVersoes.filter((v) => v.storage_path).map((v) => v.storage_path),
    },
    null,
    2,
  ),
);
console.error("storage paths salvos em scripts/backup/tecnico-legislativo-storage-paths.json");
