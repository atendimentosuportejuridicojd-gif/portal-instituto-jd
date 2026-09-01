import { readFileSync, writeFileSync } from "node:fs";

const raw = readFileSync("scripts/questoes_extracted.txt", "utf8")
  .replace(/\u00a0/g, " ")
  .replace(/\r/g, "");

const THEMES = [
  {
    match: (l) => /^Princípios Fundamentais/i.test(l),
    titulo: "Princípios Fundamentais (Título I, arts. 1º ao 4º)",
    key: "01-principios",
  },
  {
    match: (l) => /^2\.1\s/.test(l) || /^2\.2\s/.test(l),
    titulo:
      "Direitos e deveres individuais e coletivos e remédios constitucionais (art. 5º)",
    key: "02-direitos-individuais",
  },
  {
    match: (l) => /^3\.\s/.test(l),
    titulo: "Direitos sociais (arts. 6º ao 11)",
    key: "03-direitos-sociais",
  },
  {
    match: (l) => /^4\.\s/.test(l),
    titulo: "Nacionalidade (arts. 12 e 13)",
    key: "04-nacionalidade",
  },
  {
    match: (l) => /^5\.\s/.test(l),
    titulo: "Direitos políticos (arts. 14 a 16)",
    key: "05-direitos-politicos",
  },
  {
    match: (l) => /^6\.\s/.test(l),
    titulo: "Partidos políticos (art. 17)",
    key: "06-partidos",
  },
  {
    match: (l) => /^7\.1\s/.test(l) || /^7\.2\s/.test(l),
    titulo: "Organização político-administrativa do Estado (arts. 18 e 19)",
    key: "07-organizacao-estado",
  },
  {
    match: (l) => /^8\.\s/.test(l),
    titulo: "Bens da União e competências (arts. 20 a 24)",
    key: "08-bens-competencias",
  },
  {
    match: (l) => /^9\.\s/.test(l),
    titulo: "Estados federados (arts. 25 a 28)",
    key: "09-estados",
  },
  {
    match: (l) => /^10\.\s/.test(l),
    titulo: "Municípios: organização, competências e autonomia (arts. 29 a 31)",
    key: "10-municipios",
  },
  {
    match: (l) => /^11\.\s/.test(l),
    titulo: "Distrito Federal, Territórios e Intervenção (arts. 32 a 36)",
    key: "11-df-territorios-intervencao",
  },
  {
    match: (l) => /^12\.\s/.test(l),
    titulo: "Administração Pública (arts. 37 a 41)",
    key: "12-administracao-publica",
  },
  {
    match: (l) => /^13\.\s/.test(l),
    titulo: "Poder Legislativo (arts. 44 a 57)",
    key: "13-poder-legislativo",
  },
  {
    match: (l) => /^14\.\s/.test(l),
    titulo: "Processo Legislativo e espécies normativas (arts. 59 a 69)",
    key: "14-processo-legislativo",
  },
  {
    match: (l) => /^15\.\s/.test(l),
    titulo:
      "Fiscalização contábil, financeira e orçamentária — controle externo (arts. 31, 70 a 75)",
    key: "15-fiscalizacao",
  },
  {
    match: (l) => /^16\.\s/.test(l),
    titulo: "Lei Orgânica de Palhoça",
    key: "16-lei-organica-palhoca",
  },
];

function detectTheme(line) {
  const t = line.trim();
  return THEMES.find((th) => th.match(t)) ?? null;
}

function splitAlternativas(text) {
  const parts = text.split(/(?=[a-eA-E]\))/);
  const map = {};
  for (const part of parts) {
    const cleaned = part.trim().replace(/^[.\s]+/, "");
    const m = cleaned.match(/^([a-eA-E])\)\s*([\s\S]*)$/);
    if (!m) continue;
    const letra = m[1].toUpperCase();
    const corpo = m[2].replace(/\s+/g, " ").trim();
    if (corpo) map[letra] = corpo;
  }
  return map;
}

function parseQuestion(block, tema) {
  const cleaned = block.replace(/^📝\s*/, "").trim();
  if (!cleaned) return null;

  const headerMatch = cleaned.match(
    /^(\d+)\.\s*\[([^\]]+)\]\s*([\s\S]*)$/,
  );
  if (!headerMatch) {
    return { error: "no-header", preview: cleaned.slice(0, 80), tema: tema?.key };
  }

  const num = Number(headerMatch[1]);
  const referencia = headerMatch[2].replace(/\s+/g, " ").trim();
  let rest = headerMatch[3].trim();

  rest = rest.replace(/Gabarito:\s*([A-Ea-e])\s*Coment[áa]rio/i, "Gabarito: $1\nComentário");

  const gabMatch = rest.match(
    /(?:Gabarito|Resposta)\s*:\s*([A-Ea-e])\b/i,
  );
  if (!gabMatch) {
    return { error: "no-gabarito", num, referencia, tema: tema?.key };
  }
  const correta = gabMatch[1].toUpperCase();
  const beforeGab = rest.slice(0, gabMatch.index).trim();
  let comentario = rest.slice(gabMatch.index + gabMatch[0].length).trim();
  comentario = comentario
    .replace(/^Coment[áa]rio do [Pp]rofessor\s*:?\s*/i, "")
    .trim();

  const altStart = beforeGab.search(/(?:^|\n|\s)a\)/i);
  if (altStart < 0) {
    return { error: "no-alts", num, referencia, tema: tema?.key };
  }

  const enunciado = beforeGab.slice(0, altStart).replace(/\s+/g, " ").trim();
  const altsRaw = beforeGab.slice(altStart).trim();
  const altsMap = splitAlternativas(altsRaw);
  const letras = ["A", "B", "C", "D", "E"].filter((l) => altsMap[l]);

  if (letras.length < 4) {
    return {
      error: "few-alts",
      num,
      referencia,
      tema: tema?.key,
      found: Object.keys(altsMap),
    };
  }

  if (!altsMap[correta]) {
    return { error: "gabarito-missing-alt", num, referencia, tema: tema?.key, correta, found: Object.keys(altsMap) };
  }

  return {
    ordem: num,
    referencia,
    enunciado,
    comentario_professor: comentario,
    correta,
    alternativas: letras.map((letra) => ({ letra, texto: altsMap[letra] })),
    temaKey: tema.key,
  };
}

const lines = raw.split("\n");
let current = THEMES[0];
const chunks = [];
let buf = [];
let bufTema = current;

function flush() {
  const text = buf.join("\n").trim();
  if (text) chunks.push({ tema: bufTema, text });
  buf = [];
}

for (const line of lines) {
  const theme = detectTheme(line);
  if (theme) {
    flush();
    current = theme;
    continue;
  }
  if (line.includes("📝")) {
    const idx = line.indexOf("📝");
    const before = line.slice(0, idx).trim();
    const after = line.slice(idx);
    if (before) {
      const t = detectTheme(before);
      if (t) current = t;
    }
    flush();
    bufTema = current;
    buf.push(after);
    continue;
  }
  buf.push(line);
}
flush();

const questions = [];
const errors = [];
for (const c of chunks) {
  if (!c.text.includes("📝") && !/^\d+\.\s*\[/.test(c.text)) continue;
  const q = parseQuestion(c.text.startsWith("📝") ? c.text : `📝 ${c.text}`, c.tema);
  if (!q) continue;
  if (q.error) errors.push(q);
  else questions.push(q);
}

const byTema = {};
for (const th of THEMES) {
  if (!byTema[th.key]) byTema[th.key] = { titulo: th.titulo, key: th.key, questoes: [] };
}
for (const q of questions) {
  byTema[q.temaKey].questoes.push(q);
}

const payload = {
  disciplina: "Técnico Legislativo",
  modulo: "Direito Constitucional",
  materiais: THEMES.filter((t, i, arr) => arr.findIndex((x) => x.key === t.key) === i).map(
    (t, i) => ({
      ordem: i + 1,
      key: t.key,
      titulo: t.titulo,
      questoes: (byTema[t.key]?.questoes ?? []).map((q, idx) => ({
        ...q,
        ordem: idx + 1,
      })),
    }),
  ),
};

writeFileSync("scripts/questoes_parsed.json", JSON.stringify(payload, null, 2), "utf8");
console.log(
  JSON.stringify(
    {
      total: questions.length,
      errors,
      porTema: payload.materiais.map((m) => ({
        titulo: m.titulo,
        n: m.questoes.length,
      })),
    },
    null,
    2,
  ),
);
