import { readFileSync, writeFileSync } from "node:fs";
import { randomUUID } from "node:crypto";

const data = JSON.parse(readFileSync("scripts/questoes_parsed.json", "utf8"));

function sql(str) {
  return `'${String(str).replace(/'/g, "''")}'`;
}

const disciplinaId = "346a03ad-38b8-4275-a020-d646dfedc08d";
const moduloId = randomUUID();

const materialIdByKey = new Map();
const materiaisValues = [];
for (const m of data.materiais) {
  const materialId = randomUUID();
  materialIdByKey.set(m.key, materialId);
  materiaisValues.push(
    `(${sql(materialId)}, ${sql(m.titulo)}, ${sql(disciplinaId)}, ${sql(moduloId)}, ${m.ordem - 1}, true)`,
  );
}

const file00 = [
  `INSERT INTO public.modulos (id, disciplina_id, nome, ordem) VALUES (${sql(moduloId)}, ${sql(disciplinaId)}, ${sql(data.modulo)}, 3);`,
  ``,
  `INSERT INTO public.materiais (id, titulo, disciplina_id, modulo_id, ordem, publicado) VALUES\n` +
    materiaisValues.join(",\n") +
    ";",
].join("\n");
writeFileSync("scripts/batches/00-modulo-materiais.sql", file00, "utf8");

data.materiais.forEach((m, idx) => {
  const materialId = materialIdByKey.get(m.key);
  if (m.questoes.length === 0) return;
  const questaoValues = [];
  const altValues = [];
  for (const q of m.questoes) {
    const questaoId = randomUUID();
    questaoValues.push(
      `(${sql(questaoId)}, ${sql(materialId)}, ${sql(q.enunciado)}, ${sql(q.referencia)}, ${sql(q.comentario_professor)}, ${q.ordem}, true)`,
    );
    for (const a of q.alternativas) {
      altValues.push(
        `(${sql(questaoId)}, ${sql(a.letra)}, ${sql(a.texto)}, ${a.letra === q.correta}, ${"ABCDE".indexOf(a.letra)})`,
      );
    }
  }
  const content = [
    `INSERT INTO public.questoes (id, material_id, enunciado, referencia, comentario_professor, ordem, publicado) VALUES\n` +
      questaoValues.join(",\n") +
      ";",
    ``,
    `INSERT INTO public.questao_alternativas (questao_id, letra, texto, correta, ordem) VALUES\n` +
      altValues.join(",\n") +
      ";",
  ].join("\n");
  const n = String(idx + 1).padStart(2, "0");
  writeFileSync(`scripts/batches/${n}-${m.key}.sql`, content, "utf8");
});

console.log("moduloId:", moduloId, "disciplinaId:", disciplinaId);
