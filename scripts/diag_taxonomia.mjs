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

async function count(table) {
  const { count, error } = await supabase.from(table).select("*", { count: "exact", head: true });
  if (error) throw error;
  return count;
}

console.log("\n=== a) Contagens gerais ===");
console.log("disciplinas:", await count("disciplinas"));
console.log("modulos:", await count("modulos"));
console.log("materiais:", await count("materiais"));

console.log("\n=== b) Disciplinas (nome, slug) ===");
const { data: disciplinas, error: dErr } = await supabase
  .from("disciplinas")
  .select("id, nome, slug, ordem")
  .order("ordem");
if (dErr) throw dErr;
for (const d of disciplinas) {
  console.log(`- [${d.ordem}] ${d.nome}  (slug: ${d.slug})  id:${d.id}`);
}

console.log("\n=== c) Materiais por disciplina / módulo ===");
const { data: modulos, error: mErr } = await supabase
  .from("modulos")
  .select("id, nome, ordem, disciplina_id")
  .order("ordem");
if (mErr) throw mErr;

const { data: materiais, error: matErr } = await supabase
  .from("materiais")
  .select("id, titulo, disciplina_id, modulo_id");
if (matErr) throw matErr;

const materiaisPorDisciplina = {};
const materiaisPorModulo = {};
const materiaisSemDisciplina = [];
for (const m of materiais) {
  if (m.disciplina_id) {
    materiaisPorDisciplina[m.disciplina_id] = (materiaisPorDisciplina[m.disciplina_id] || 0) + 1;
  } else {
    materiaisSemDisciplina.push(m.id);
  }
  if (m.modulo_id) {
    materiaisPorModulo[m.modulo_id] = (materiaisPorModulo[m.modulo_id] || 0) + 1;
  }
}

for (const d of disciplinas) {
  const totalDisc = materiaisPorDisciplina[d.id] || 0;
  console.log(`\n${d.nome} (${d.slug}) — ${totalDisc} material(is) direto na disciplina`);
  const modsDaDisciplina = modulos.filter((m) => m.disciplina_id === d.id);
  if (modsDaDisciplina.length === 0) {
    console.log("   (sem módulos cadastrados)");
  }
  for (const mod of modsDaDisciplina) {
    const totalMod = materiaisPorModulo[mod.id] || 0;
    console.log(`   - módulo "${mod.nome}": ${totalMod} material(is)`);
  }
}
console.log(`\nMateriais sem disciplina_id: ${materiaisSemDisciplina.length}`);

console.log("\n=== d) Referências externas a materiais ===");
const materialIds = materiais.map((m) => m.id);

async function countRefs(table, column) {
  if (materialIds.length === 0) return 0;
  const { count, error } = await supabase
    .from(table)
    .select("*", { count: "exact", head: true })
    .in(column, materialIds);
  if (error) throw error;
  return count;
}

console.log("questoes.material_id ->", await countRefs("questoes", "material_id"));
console.log("trilha_materiais.material_id ->", await countRefs("trilha_materiais", "material_id"));
console.log("concurso_materiais.material_id ->", await countRefs("concurso_materiais", "material_id"));
console.log("material_versoes.material_id ->", await countRefs("material_versoes", "material_id"));

console.log("\n=== Disciplinas SEM nenhum material vinculado (candidatas a remoção) ===");
for (const d of disciplinas) {
  const total = materiaisPorDisciplina[d.id] || 0;
  if (total === 0) console.log(`- ${d.nome} (${d.slug})`);
}

console.log("\n=== Módulos SEM nenhum material vinculado ===");
for (const mod of modulos) {
  const total = materiaisPorModulo[mod.id] || 0;
  if (total === 0) {
    const disc = disciplinas.find((d) => d.id === mod.disciplina_id);
    console.log(`- ${mod.nome} — disciplina: ${disc ? disc.nome : "?"}`);
  }
}

console.log("\n=== Colunas atuais (amostra) ===");
const { data: discSample } = await supabase.from("disciplinas").select("*").limit(1);
console.log("disciplinas:", discSample && discSample[0] ? Object.keys(discSample[0]) : "(vazio)");
const { data: modSample } = await supabase.from("modulos").select("*").limit(1);
console.log("modulos:", modSample && modSample[0] ? Object.keys(modSample[0]) : "(vazio)");

console.log("\n=== Valores de especifica/grupo/protegida por disciplina ===");
const { data: discFull } = await supabase.from("disciplinas").select("nome, slug, especifica, grupo, protegida, concurso_id");
for (const d of discFull) {
  console.log(`- ${d.nome} | especifica=${d.especifica} | grupo=${d.grupo} | protegida=${d.protegida} | concurso_id=${d.concurso_id}`);
}
