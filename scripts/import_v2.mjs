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

const DISCIPLINA_ID = "346a03ad-38b8-4275-a020-d646dfedc08d"; // Técnico Legislativo
const data = JSON.parse(readFileSync("scripts/questoes_v2_parsed.json", "utf8"));

let totalQ = 0;
let totalA = 0;

for (const modulo of data) {
  // módulo: reaproveita se já existir com o mesmo nome nesta disciplina
  const { data: existingMod, error: emErr } = await supabase
    .from("modulos")
    .select("id")
    .eq("disciplina_id", DISCIPLINA_ID)
    .eq("nome", modulo.nome)
    .maybeSingle();
  if (emErr) throw emErr;

  let moduloId = existingMod?.id;
  if (!moduloId) {
    const { data: insMod, error: imErr } = await supabase
      .from("modulos")
      .insert({ disciplina_id: DISCIPLINA_ID, nome: modulo.nome, ordem: modulo.ordem })
      .select("id")
      .single();
    if (imErr) throw imErr;
    moduloId = insMod.id;
    console.log("módulo criado:", modulo.nome, moduloId);
  } else {
    console.log("módulo já existia:", modulo.nome, moduloId);
  }

  for (const mat of modulo.materiais) {
    const { data: existingMat, error: ematErr } = await supabase
      .from("materiais")
      .select("id")
      .eq("modulo_id", moduloId)
      .eq("titulo", mat.titulo)
      .maybeSingle();
    if (ematErr) throw ematErr;

    let materialId = existingMat?.id;
    if (!materialId) {
      const { data: insMat, error: imatErr } = await supabase
        .from("materiais")
        .insert({
          titulo: mat.titulo,
          disciplina_id: DISCIPLINA_ID,
          modulo_id: moduloId,
          ordem: mat.ordem,
          publicado: true,
        })
        .select("id")
        .single();
      if (imatErr) throw imatErr;
      materialId = insMat.id;
    }

    const { count: existentes, error: cErr } = await supabase
      .from("questoes")
      .select("id", { count: "exact", head: true })
      .eq("material_id", materialId);
    if (cErr) throw cErr;
    if (existentes && existentes > 0) {
      console.log(`  [${modulo.nome}] ${mat.titulo}: já tem ${existentes} questões — pulando`);
      continue;
    }

    const questoesPayload = mat.questoes.map((q) => ({
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
    for (const q of mat.questoes) {
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

    totalQ += questoesPayload.length;
    totalA += altPayload.length;
    console.log(`  [${modulo.nome}] ${mat.titulo}: ${questoesPayload.length} questões, ${altPayload.length} alternativas`);
  }
}

console.log("TOTAL:", totalQ, "questões,", totalA, "alternativas");
