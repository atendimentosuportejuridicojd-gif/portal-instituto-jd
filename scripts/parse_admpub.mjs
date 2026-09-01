import { readFileSync, writeFileSync } from "node:fs";

const raw = readFileSync("scripts/admpub_extracted.txt", "utf8")
  .replace(/ /g, " ")
  .replace(/\r/g, "");

const blocks = raw
  .split(/\n\s*\n/)
  .map((b) => b.trim())
  .filter(Boolean);

const HEADER_RE = /^📝\s*(?:N|\d+)\.\s*\[([^\]]+)\]/;
const ALT_LINE_RE = /^a\)/;

const questoes = [];
const skipped = [];

for (const block of blocks) {
  const lines = block.split("\n");
  const headerM = lines[0].match(HEADER_RE);
  if (!headerM) {
    skipped.push({ reason: "no-header", preview: block.slice(0, 80) });
    continue;
  }
  const referencia = headerM[1].replace(/\s+/g, " ").trim();

  const altLineIdx = lines.findIndex((l) => ALT_LINE_RE.test(l.trim()));
  if (altLineIdx < 0) {
    // questão dissertativa (sem alternativas) — não se encaixa no formato de quiz
    skipped.push({ reason: "sem-alternativas", referencia });
    continue;
  }

  const enunciado = lines
    .slice(1, altLineIdx)
    .join(" ")
    // o docx original cola alguns marcadores sem espaço (ex.: "funcional.II.",
    // "impacto."PORQUEII.") por estarem no mesmo parágrafo/estilo — separa-os
    .replace(/\.(I{1,3}|IV|VI{0,3}|IX|X)\./g, ". $1. ")
    .replace(/(\S)PORQUE/g, "$1 PORQUE")
    .replace(/PORQUE(\S)/g, "PORQUE $1")
    .replace(/\s+/g, " ")
    .trim();

  const altLine = lines[altLineIdx].trim();
  const alternativas = [];
  // busca sequencial por "a)", "b)", "c)"... nessa ordem: evita falso-positivo
  // de letra+parêntese dentro do texto (ex.: "(Siape)." contém "e)") porque
  // procura especificamente a próxima letra da sequência, não qualquer uma
  const markers = [];
  let searchFrom = 0;
  for (const letra of ["a", "b", "c", "d", "e"]) {
    const idx = altLine.indexOf(`${letra})`, searchFrom);
    if (idx < 0) break;
    markers.push({ letra, start: idx, end: idx + 2 });
    searchFrom = idx + 2;
  }
  for (let k = 0; k < markers.length; k++) {
    const start = markers[k].end;
    const end = k + 1 < markers.length ? markers[k + 1].start : altLine.length;
    const texto = altLine.slice(start, end).replace(/\s+/g, " ").trim();
    if (texto) alternativas.push({ letra: markers[k].letra.toUpperCase(), texto });
  }

  const rest = lines.slice(altLineIdx + 1).join("\n");
  const gabM = rest.match(/Gabarito:\s*([A-E])/);
  if (!gabM) {
    skipped.push({ reason: "no-gabarito", referencia });
    continue;
  }
  const correta = gabM[1];

  const comentM = rest.match(/Comentário do professor:\s*([\s\S]*)/);
  const comentario_professor = comentM
    ? comentM[1].replace(/\s+/g, " ").trim()
    : "";
  if (!comentario_professor) {
    skipped.push({ reason: "sem-comentario", referencia });
  }

  if (alternativas.length !== 4 && alternativas.length !== 5) {
    skipped.push({ reason: "alt-count", referencia, n: alternativas.length });
    continue;
  }
  if (!alternativas.find((a) => a.letra === correta)) {
    skipped.push({ reason: "gabarito-missing-alt", referencia });
    continue;
  }

  questoes.push({
    referencia,
    enunciado,
    alternativas,
    correta,
    comentario_professor,
  });
}

const payload = {
  materialId: "80360766-cbd3-4a1e-a5d2-c8df15fcd017",
  titulo: "Noções Gerais AP",
  questoes: questoes.map((q, idx) => ({ ...q, ordem: idx + 1 })),
};

writeFileSync("scripts/admpub_parsed.json", JSON.stringify(payload, null, 2), "utf8");

console.log(
  JSON.stringify(
    { totalBlocks: blocks.length, totalQuestoes: questoes.length, skipped },
    null,
    2,
  ),
);
