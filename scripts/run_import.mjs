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

const data = JSON.parse(readFileSync("scripts/questoes_parsed.json", "utf8"));

// Materiais já criados numa etapa anterior (modulo "Direito Constitucional" sob a
// disciplina "Técnico Legislativo" existente, id 346a03ad-38b8-4275-a020-d646dfedc08d).
const materialIdByKey = {
  "01-principios": "edf9f9a9-9b2c-4e8c-bb9d-4ed5831ef0da",
  "02-direitos-individuais": "48313476-5de3-4ca6-bb66-4ec5318918bd",
  "03-direitos-sociais": "788870d9-4155-42bd-940b-d92a5e945fd7",
  "04-nacionalidade": "cdf9edb2-54fc-412a-abfe-1fc8bd769df8",
  "05-direitos-politicos": "141a9da0-1e22-4a13-ab75-672cbb17e8b8",
  "06-partidos": "fa3cf040-b830-4d9a-bafe-14cddc663915",
  "07-organizacao-estado": "95430ed1-50c7-4c72-8a87-0a326adff5c7",
  "08-bens-competencias": "209ba7f1-0766-4622-a7ca-e096c5a9a559",
  "09-estados": "a99a0bc4-f9cc-41ff-887b-861be8696d24",
  "10-municipios": "16808ffc-c67f-4363-bf66-d6d4fcc364dc",
  "11-df-territorios-intervencao": "26be00b4-8c3b-4a9c-b15f-218e3a6506ae",
  "12-administracao-publica": "78af4a18-5f12-412a-b815-c7cc6931356a",
  "13-poder-legislativo": "0d0fec83-707e-4f35-b90b-61f7823650ce",
  "14-processo-legislativo": "b75146a2-8fd2-4edd-b0ea-6f49e8aa8fab",
  "15-fiscalizacao": "54207e66-e119-4309-ac93-5d4c4e349ffb",
  "16-lei-organica-palhoca": "75a1bad3-a204-4e47-9c91-235da54a89d6",
};

let totalQ = 0;
let totalA = 0;

for (const m of data.materiais) {
  const materialId = materialIdByKey[m.key];
  if (!materialId) throw new Error(`sem material_id para tema ${m.key}`);
  if (m.questoes.length === 0) continue;

  const { count: existentes } = await supabase
    .from("questoes")
    .select("id", { count: "exact", head: true })
    .eq("material_id", materialId);
  if (existentes && existentes > 0) {
    console.log(m.key, "já tem", existentes, "questões — pulando");
    continue;
  }

  const questoesPayload = m.questoes.map((q) => ({
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
  for (const q of m.questoes) {
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
  console.log(m.key, questoesPayload.length, "questões,", altPayload.length, "alternativas");
}

console.log("TOTAL:", totalQ, "questões,", totalA, "alternativas");
