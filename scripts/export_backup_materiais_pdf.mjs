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

const materiais = await fetchAll("materiais");
const matIds = materiais.map((m) => m.id);

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

const trilhaMateriais = await fetchInChunks("trilha_materiais", "material_id", matIds);
const concursoMateriais = await fetchInChunks("concurso_materiais", "material_id", matIds);
const materialVersoes = await fetchInChunks("material_versoes", "material_id", matIds);

const cols = {
  materiais: [
    "id", "titulo", "descricao", "disciplina_id", "modulo_id", "arquivo_url", "paginas", "tags",
    "publicado", "created_at", "updated_at", "versao", "publicado_em", "atualizado_em",
    "storage_path", "ordem", "download_permitido", "tamanho_bytes",
  ],
  trilha_materiais: ["trilha_id", "material_id", "ordem"],
  concurso_materiais: ["concurso_id", "material_id", "exclusivo", "ordem"],
  material_versoes: ["id", "material_id", "versao", "arquivo_url", "notas", "created_by", "storage_path", "created_at"],
};

const parts = [];
parts.push(`-- Backup dos 44 registros de materiais (PDFs do acervo legado) antes da exclusao definitiva.`);
parts.push(`-- Gerado em ${new Date().toISOString()}.`);
parts.push(`-- ATENCAO: isto salva METADADOS (titulo, storage_path, etc), NAO os bytes do PDF.`);
parts.push(`-- Uma vez apagados os objetos do bucket "materiais" no Storage, o conteudo do`);
parts.push(`-- arquivo em si nao e recuperavel a partir deste backup.`);
parts.push(`-- Inclui tambem trilha_materiais, concurso_materiais e material_versoes vinculados,`);
parts.push(`-- que tambem serao apagados no PASSO 3 e nao foram mencionados explicitamente no pedido.`);
parts.push("");
parts.push("BEGIN;");
parts.push("");

function section(title, table, rows) {
  parts.push(`-- ${title}: ${rows.length} registro(s)`);
  for (const row of rows) parts.push(toInsert(table, cols[table], row));
  parts.push("");
}

section("1) materiais", "materiais", materiais);
section("2) trilha_materiais", "trilha_materiais", trilhaMateriais);
section("3) concurso_materiais", "concurso_materiais", concursoMateriais);
section("4) material_versoes", "material_versoes", materialVersoes);

parts.push("COMMIT;");
parts.push("");

const now = new Date();
const yyyy = now.getFullYear();
const mm = String(now.getMonth() + 1).padStart(2, "0");
const dd = String(now.getDate()).padStart(2, "0");
const outPath = `scripts/backup/materiais-pdf-${yyyy}${mm}${dd}.sql`;
writeFileSync(outPath, parts.join("\n"), "utf8");

console.error("\n=== Resumo do backup ===");
console.error("arquivo:", outPath);
console.error("materiais:", materiais.length);
console.error("trilha_materiais:", trilhaMateriais.length);
console.error("concurso_materiais:", concursoMateriais.length);
console.error("material_versoes:", materialVersoes.length);
console.error("com storage_path:", materiais.filter((m) => m.storage_path).length);
