import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

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
console.log("logado como", auth.user.email);

const data = JSON.parse(readFileSync("scripts/admpub_parsed.json", "utf8"));
const materialId = data.materialId;

const { count: existentes } = await supabase
  .from("questoes")
  .select("id", { count: "exact", head: true })
  .eq("material_id", materialId);
if (existentes && existentes > 0) {
  console.log("material já tem", existentes, "questões — abortando para não duplicar");
  process.exit(0);
}

const questoesPayload = data.questoes.map((q) => ({
  material_id: materialId,
  enunciado: q.enunciado,
  referencia: q.referencia,
  comentario_professor: q.comentario_professor,
  ordem: q.ordem,
  publicado: true,
}));
const { data: inserted, error: qErr } = await supabase
  .from("questoes")
  .insert(questoesPayload)
  .select("id, ordem");
if (qErr) throw qErr;

const idByOrdem = new Map(inserted.map((r) => [r.ordem, r.id]));
const altPayload = [];
for (const q of data.questoes) {
  const questaoId = idByOrdem.get(q.ordem);
  for (const a of q.alternativas) {
    altPayload.push({
      questao_id: questaoId,
      letra: a.letra,
      texto: a.texto,
      correta: a.letra === q.correta,
      ordem: "ABCDE".indexOf(a.letra),
    });
  }
}
const { error: aErr } = await supabase.from("questao_alternativas").insert(altPayload);
if (aErr) throw aErr;

console.log("TOTAL:", questoesPayload.length, "questões,", altPayload.length, "alternativas");
