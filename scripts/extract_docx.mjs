import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { tmpdir } from "node:os";
import { join } from "node:path";

const src =
  "c:\\Users\\User\\Downloads\\Direito_Constitucional_Técnico_Legislativo_SELECIONADO_7_por_tema.docx";
const tmp = join(tmpdir(), `docx-extract-${Date.now()}`);
mkdirSync(tmp, { recursive: true });
const zipPath = join(tmp, "doc.zip");

execFileSync("powershell.exe", [
  "-NoProfile",
  "-Command",
  `Copy-Item -LiteralPath ${JSON.stringify(src)} -Destination ${JSON.stringify(zipPath)}; Expand-Archive -LiteralPath ${JSON.stringify(zipPath)} -DestinationPath ${JSON.stringify(tmp)} -Force`,
]);

const xml = readFileSync(join(tmp, "word", "document.xml"), "utf8");
const text = xml
  .replace(/<\/w:p>/g, "\n")
  .replace(/<w:tab[^/]*\/>/g, "\t")
  .replace(/<[^>]+>/g, "")
  .replace(/&amp;/g, "&")
  .replace(/&lt;/g, "<")
  .replace(/&gt;/g, ">")
  .replace(/&quot;/g, '"')
  .replace(/&#39;/g, "'");

const out = "scripts/questoes_extracted.txt";
writeFileSync(out, text, "utf8");
console.log("wrote", out, "chars", text.length);
