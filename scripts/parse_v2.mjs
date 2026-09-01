import { readFileSync, writeFileSync } from "node:fs";

const SRC = "C:\\Users\\User\\Downloads\\revisao-tecnico-legislativo-fundatec.md";
const raw = readFileSync(SRC, "utf8").replace(/\u00a0/g, " ").replace(/\r/g, "");
const lines = raw.split("\n");

const PART_RE = /^# (PARTE \d+ — .+|CONHECIMENTO ESPECÍFICO)/;
const BLOCO_RE = /^## Bloco (\d+): (.+)/;
const ASSUNTO_RE = /^## Assunto (\d+): (.+)/;
const TOPICO_RE = /^## Tópico ([\d.]+) — (.+)/;
const QUESTAO_RE = /^### 📝 \*\*(\d+)\.\s*\[([^\]]+)\]\*\*/;

// módulo state
let moduloKey = null;
let moduloNome = null;
// se true, o módulo agrupa vários Assuntos e o título da matéria precisa
// do prefixo do Assunto para não colidir (ex.: "Ambiente e componentes do
// programa" aparece tanto em Word quanto em Excel)
let prefixaAssunto = false;
let assuntoTitulo = null;
let topicoNum = null;
let topicoTitulo = null;

const modulos = new Map(); // key -> { nome, materiais: Map(topicoNum -> {titulo, questoes: []}) }

function ensureModulo(key, nome) {
  if (!modulos.has(key)) modulos.set(key, { nome, materiais: new Map() });
  return modulos.get(key);
}

function ensureMaterial() {
  const mod = ensureModulo(moduloKey, moduloNome);
  if (!mod.materiais.has(topicoNum)) {
    const titulo =
      prefixaAssunto && assuntoTitulo && assuntoTitulo !== topicoTitulo
        ? `${assuntoTitulo} — ${topicoTitulo}`
        : topicoTitulo;
    mod.materiais.set(topicoNum, { titulo, questoes: [] });
  }
  return mod.materiais.get(topicoNum);
}

function stripMd(s) {
  return s
    .replace(/\*\*/g, "")
    .replace(/^\*|\*$/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

let i = 0;
const errors = [];
while (i < lines.length) {
  const line = lines[i];

  const partM = line.match(PART_RE);
  if (partM) {
    if (/PARTE 3/.test(partM[1])) {
      moduloKey = "informatica";
      moduloNome = "Informática";
      prefixaAssunto = true;
    } else if (/PARTE 5/.test(partM[1])) {
      moduloKey = "legislacao-institucional";
      moduloNome = "Legislação Institucional";
      prefixaAssunto = true;
    } else if (/CONHECIMENTO ESPEC/i.test(partM[1])) {
      moduloKey = null; // definido pelo Bloco seguinte
      moduloNome = null;
      prefixaAssunto = false;
    }
    i++;
    continue;
  }

  const assuntoM = line.match(ASSUNTO_RE);
  if (assuntoM) {
    assuntoTitulo = assuntoM[2].replace(/\s*\(.*\)\s*$/, "").trim();
    i++;
    continue;
  }

  const blocoM = line.match(BLOCO_RE);
  if (blocoM) {
    const BLOCO_NOMES = {
      4: "Orçamento e Contabilidade Pública",
      5: "Licitações e Contratos",
      6: "Gestão de Materiais, Patrimônio e Almoxarifado",
      7: "Gestão de Pessoas na Administração Pública",
      8: "Rotinas Administrativas e Legislativas",
      9: "Comunicação Administrativa",
      10: "Ouvidoria Pública",
    };
    moduloKey = `bloco-${blocoM[1]}`;
    moduloNome = BLOCO_NOMES[Number(blocoM[1])] ?? blocoM[2].trim();
    prefixaAssunto = false;
    i++;
    continue;
  }

  const topicoM = line.match(TOPICO_RE);
  if (topicoM) {
    topicoNum = topicoM[1];
    topicoTitulo = topicoM[2].trim();
    i++;
    continue;
  }

  const qM = line.match(QUESTAO_RE);
  if (qM) {
    const num = Number(qM[1]);
    const referencia = qM[2].replace(/\s+/g, " ").trim();
    // acumula linhas até o próximo cabeçalho ### / ## / #
    const block = [];
    i++;
    while (
      i < lines.length &&
      !/^### 📝/.test(lines[i]) &&
      !/^## /.test(lines[i]) &&
      !/^# /.test(lines[i])
    ) {
      block.push(lines[i]);
      i++;
    }
    const text = block.join("\n").trim();

    // separa enunciado / alternativas / gabarito / comentário
    const altRe = /^- \*\*([A-E])\)\*\*\s*(.+)$/;
    const blockLines = text.split("\n");
    let firstAltIdx = blockLines.findIndex((l) => altRe.test(l.trim()));
    if (firstAltIdx < 0) {
      errors.push({ num, referencia, moduloKey, topicoNum, error: "no-alts" });
      continue;
    }
    const enunciadoLines = blockLines.slice(0, firstAltIdx);
    const enunciado = stripMd(enunciadoLines.join(" "));

    const alternativas = [];
    let altEndIdx = firstAltIdx;
    for (let j = firstAltIdx; j < blockLines.length; j++) {
      const m = blockLines[j].trim().match(altRe);
      if (m) {
        alternativas.push({ letra: m[1], texto: stripMd(m[2]) });
        altEndIdx = j;
      } else if (alternativas.length > 0 && blockLines[j].trim() === "") {
        break;
      }
    }

    const rest = blockLines.slice(altEndIdx + 1).join("\n");
    const gabM = rest.match(/\*\*Gabarito:\s*([A-E])\*\*/);
    if (!gabM) {
      errors.push({ num, referencia, moduloKey, topicoNum, error: "no-gabarito" });
      continue;
    }
    const correta = gabM[1];

    const comentLine = rest.split("\n").find((l) => /^> \*/.test(l.trim()));
    let comentario = "";
    if (comentLine) {
      comentario = stripMd(comentLine.trim().replace(/^>\s*/, ""));
    } else {
      errors.push({ num, referencia, moduloKey, topicoNum, error: "no-comentario" });
    }

    if (alternativas.length !== 5) {
      errors.push({ num, referencia, moduloKey, topicoNum, error: "alt-count", n: alternativas.length });
      continue;
    }
    if (!alternativas.find((a) => a.letra === correta)) {
      errors.push({ num, referencia, moduloKey, topicoNum, error: "gabarito-missing-alt" });
      continue;
    }
    if (!moduloKey) {
      errors.push({ num, referencia, error: "sem-modulo" });
      continue;
    }

    const material = ensureMaterial();
    material.questoes.push({
      numOriginal: num,
      referencia,
      enunciado,
      alternativas,
      correta,
      comentario_professor: comentario,
    });
    continue;
  }

  i++;
}

// monta payload final
const payload = [];
let modOrdem = 4;
for (const [key, mod] of modulos) {
  const materiais = [];
  let matOrdem = 0;
  for (const [topicoNum2, mat] of mod.materiais) {
    materiais.push({
      topico: topicoNum2,
      titulo: mat.titulo,
      ordem: matOrdem++,
      questoes: mat.questoes.map((q, idx) => ({ ...q, ordem: idx + 1 })),
    });
  }
  payload.push({ key, nome: mod.nome, ordem: modOrdem++, materiais });
}

writeFileSync("scripts/questoes_v2_parsed.json", JSON.stringify(payload, null, 2), "utf8");

const totalQuestoes = payload.reduce(
  (acc, m) => acc + m.materiais.reduce((a2, mat) => a2 + mat.questoes.length, 0),
  0,
);
const totalMaterias = payload.reduce((acc, m) => acc + m.materiais.length, 0);

console.log(
  JSON.stringify(
    {
      totalModulos: payload.length,
      totalMaterias,
      totalQuestoes,
      errors,
      modulos: payload.map((m) => ({
        key: m.key,
        nome: m.nome,
        materias: m.materiais.length,
        questoes: m.materiais.reduce((a, mat) => a + mat.questoes.length, 0),
      })),
    },
    null,
    2,
  ),
);
