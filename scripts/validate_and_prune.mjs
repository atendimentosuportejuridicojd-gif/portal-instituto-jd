import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_PUBLISHABLE_KEY;
const EMAIL = process.env.ADMIN_SCRIPT_EMAIL;
const PASSWORD = process.env.ADMIN_SCRIPT_PASSWORD;
const EXECUTE = process.argv.includes("--execute");

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
const { error: authError } = await supabase.auth.signInWithPassword({ email: EMAIL, password: PASSWORD });
if (authError) throw authError;

const keepList = JSON.parse(readFileSync("scripts/keep_list_direito_administrativo.json", "utf8"));

let totalBefore = 0;
let totalKeep = 0;
let totalDelete = 0;
const deletionsByMateria = {};

for (const [nome, { materialId, keepIds }] of Object.entries(keepList)) {
  const { data: all, error } = await supabase
    .from("questoes")
    .select("id")
    .eq("material_id", materialId);
  if (error) throw error;

  const allIds = new Set(all.map((q) => q.id));
  const keepSet = new Set(keepIds);

  const missing = keepIds.filter((id) => !allIds.has(id));
  if (missing.length > 0) {
    console.log(`ERRO em "${nome}": ${missing.length} id(s) da keepList não existem nesse material:`, missing);
    process.exit(1);
  }

  const toDelete = [...allIds].filter((id) => !keepSet.has(id));

  totalBefore += all.length;
  totalKeep += keepIds.length;
  totalDelete += toDelete.length;
  deletionsByMateria[nome] = { materialId, total: all.length, manter: keepIds.length, apagar: toDelete.length, toDelete };

  console.log(`${nome}: total=${all.length} manter=${keepIds.length} apagar=${toDelete.length}`);
}

console.log("\n=== RESUMO ===");
console.log("total antes:", totalBefore, "| manter:", totalKeep, "| apagar:", totalDelete);

if (!EXECUTE) {
  console.log("\n(dry-run — nenhuma alteração feita. Rode com --execute para aplicar.)");
  process.exit(0);
}

console.log("\nExecutando exclusão...");
for (const [nome, info] of Object.entries(deletionsByMateria)) {
  if (info.toDelete.length === 0) continue;
  const { error: altErr } = await supabase
    .from("questao_alternativas")
    .delete()
    .in("questao_id", info.toDelete);
  if (altErr) throw altErr;

  const { error: qErr } = await supabase.from("questoes").delete().in("id", info.toDelete);
  if (qErr) throw qErr;

  console.log(`${nome}: apagadas ${info.toDelete.length} questões (+ alternativas).`);
}

console.log("\nRenumerando 'ordem' das questões restantes em cada matéria...");
for (const [nome, { materialId }] of Object.entries(keepList)) {
  const { data: restantes, error } = await supabase
    .from("questoes")
    .select("id, ordem")
    .eq("material_id", materialId)
    .order("ordem");
  if (error) throw error;

  for (let i = 0; i < restantes.length; i++) {
    const novaOrdem = i + 1;
    if (restantes[i].ordem !== novaOrdem) {
      const { error: upErr } = await supabase
        .from("questoes")
        .update({ ordem: novaOrdem })
        .eq("id", restantes[i].id);
      if (upErr) throw upErr;
    }
  }
  console.log(`${nome}: ${restantes.length} questões renumeradas (1..${restantes.length}).`);
}

console.log("\nCONCLUÍDO.");
