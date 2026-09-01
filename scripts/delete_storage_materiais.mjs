import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";

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

// Paths exatos confirmados via storage.objects antes de rodar este script,
// salvos em scripts/backup/storage-paths-to-delete.json.
const paths = JSON.parse(readFileSync("scripts/backup/storage-paths-to-delete.json", "utf8"));
if (paths.length === 0) {
  console.error("lista de paths vazia, nada a fazer");
  process.exit(1);
}

const { data, error } = await supabase.storage.from("materiais").remove(paths);
if (error) throw error;
console.error(`removidos: ${data.length} de ${paths.length} solicitados`);
for (const d of data) console.error(" -", d.name);
