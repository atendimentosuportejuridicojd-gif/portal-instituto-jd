/**
 * Importa as questões do simulado gratuito a partir de arquivos Markdown com
 * front-matter. Reimportar o mesmo arquivo sobrescreve a questão (chave: questao_id).
 *
 * Uso:
 *   SUPABASE_URL=... SUPABASE_PUBLISHABLE_KEY=... \
 *   ADMIN_SCRIPT_EMAIL=... ADMIN_SCRIPT_PASSWORD=... \
 *   bun scripts/import_simulado.mjs <pasta-ou-arquivos.md>
 *
 * Formato esperado:
 * ---
 * questao_id: cj-001
 * materia: direito-constitucional
 * gabarito: c
 * comentario: (opcional)
 * ---
 * Enunciado...
 *
 * a) alternativa 1
 * ...
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_PUBLISHABLE_KEY);
const { data: auth, error: authError } = await supabase.auth.signInWithPassword({
  email: process.env.ADMIN_SCRIPT_EMAIL,
  password: process.env.ADMIN_SCRIPT_PASSWORD,
});
if (authError) throw authError;
console.log("logado como", auth.user.email);

const entradas = process.argv.slice(2);
if (entradas.length === 0) throw new Error("Informe a pasta ou os arquivos .md das questões.");

const arquivos = entradas.flatMap((p) =>
  statSync(p).isDirectory()
    ? readdirSync(p)
        .filter((f) => f.endsWith(".md"))
        .sort()
        .map((f) => join(p, f))
    : [p],
);

function parseArquivo(caminho) {
  const raw = readFileSync(caminho, "utf8").replace(/\r\n/g, "\n");
  const m = raw.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!m) throw new Error(`Front-matter não encontrado em ${caminho}`);
  const meta = {};
  for (const linha of m[1].split("\n")) {
    const i = linha.indexOf(":");
    if (i > 0) meta[linha.slice(0, i).trim()] = linha.slice(i + 1).trim();
  }
  const corpo = m[2].trim();

  const alternativas = [];
  const enunciadoLinhas = [];
  let comentario = meta.comentario ?? null;
  let secaoComentario = false;

  for (const linha of corpo.split("\n")) {
    if (/^#{1,6}\s*coment/i.test(linha)) {
      secaoComentario = true;
      comentario = comentario ?? "";
      continue;
    }
    if (secaoComentario) {
      comentario = `${comentario}${comentario ? "\n" : ""}${linha}`;
      continue;
    }
    const alt = linha.match(/^\s*([a-eA-E])\)\s*(.+)$/);
    if (alt) alternativas.push({ letra: alt[1].toLowerCase(), texto: alt[2].trim() });
    else enunciadoLinhas.push(linha);
  }

  if (!meta.questao_id || !meta.materia || !meta.gabarito)
    throw new Error(`Front-matter incompleto em ${caminho}`);
  if (alternativas.length < 2) throw new Error(`Alternativas não encontradas em ${caminho}`);

  return {
    questao_id: meta.questao_id,
    materia: meta.materia,
    gabarito: meta.gabarito.toLowerCase(),
    comentario: comentario?.trim() || null,
    enunciado: enunciadoLinhas.join("\n").trim(),
    alternativas,
  };
}

let ordem = 0;
for (const caminho of arquivos) {
  const q = parseArquivo(caminho);
  ordem += 1;

  const { data: questao, error } = await supabase
    .from("simulado_questoes")
    .upsert(
      {
        questao_id: q.questao_id,
        materia: q.materia,
        enunciado: q.enunciado,
        comentario: q.comentario,
        ordem,
        publicado: true,
      },
      { onConflict: "questao_id" },
    )
    .select("id")
    .single();
  if (error) throw error;

  await supabase.from("simulado_alternativas").delete().eq("questao_id", questao.id);
  const { error: altErr } = await supabase.from("simulado_alternativas").insert(
    q.alternativas.map((a, i) => ({
      questao_id: questao.id,
      letra: a.letra,
      texto: a.texto,
      correta: a.letra === q.gabarito,
      ordem: i,
    })),
  );
  if (altErr) throw altErr;

  console.log(`ok ${q.questao_id} (${q.materia}) — ${q.alternativas.length} alternativas`);
}

console.log("total importado:", arquivos.length);
