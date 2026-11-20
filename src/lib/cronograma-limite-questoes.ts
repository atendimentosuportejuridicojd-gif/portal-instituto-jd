/**
 * Limite de questões por matéria em UM cronograma (exceção por cronograma, não regra do portal).
 *
 * Fica em `cronogramas_aluno.resumo.limite_questoes`, como `somente_questoes` e `excluir_materias`:
 *   { por_materia: 10, materias: ["<id da matéria>", ...] }
 * Vale só para as matérias listadas (as que o aluno ainda não tinha respondido quando o limite foi definido) e
 * só enquanto o cronograma existir: ao excluí-lo, a exceção some junto. Sem a chave, tudo funciona como sempre.
 *
 * Quais questões entram: as reais primeiro (na ordem do banco); se a matéria tiver menos reais que o limite, as
 * inéditas completam até o limite. O que o aluno já respondeu na sessão em andamento nunca sai da seleção.
 */

export interface LimiteQuestoes {
  porMateria: number;
  materias: Set<string>;
}

/** Lê o limite gravado no resumo do cronograma; null quando o cronograma não tem exceção. */
export function lerLimite(resumo: unknown): LimiteQuestoes | null {
  const bruto = (resumo as { limite_questoes?: { por_materia?: unknown; materias?: unknown } } | null | undefined)
    ?.limite_questoes;
  const por = Number(bruto?.por_materia);
  if (!bruto || !Number.isInteger(por) || por < 1 || !Array.isArray(bruto.materias)) return null;
  return { porMateria: por, materias: new Set(bruto.materias.filter((m): m is string => typeof m === "string")) };
}

/** Limite que vale para a matéria (null = sem limite). */
export function limiteDaMateria(limite: LimiteQuestoes | null | undefined, materialId: string): number | null {
  return limite && limite.materias.has(materialId) ? limite.porMateria : null;
}

/** Aplica o limite à quantidade de questões de uma matéria. */
export function capar(limite: LimiteQuestoes | null | undefined, materialId: string, quantidade: number): number {
  const l = limiteDaMateria(limite, materialId);
  return l == null ? quantidade : Math.min(quantidade, l);
}

/** Questão inédita (elaborada pelo Instituto J&D) se distingue da real pela referência. */
export function ehQuestaoInedita(referencia: string | null | undefined): boolean {
  return /inedit/i.test((referencia ?? "").normalize("NFD").replace(/\p{M}/gu, ""));
}

export interface QuestaoParaLimite {
  id: string;
  referencia: string | null;
  ordem: number;
}

/**
 * Escolhe até `limite` questões: primeiro as que o aluno já respondeu nesta sessão, depois as reais e por fim as
 * inéditas, cada grupo na ordem do banco. A escolha é estável: responder uma questão escolhida não muda o conjunto.
 */
export function escolherQuestoes(
  questoes: QuestaoParaLimite[],
  limite: number,
  respondidas: ReadonlySet<string> = new Set(),
): string[] {
  const grupo = (q: QuestaoParaLimite) => (respondidas.has(q.id) ? 0 : ehQuestaoInedita(q.referencia) ? 2 : 1);
  return [...questoes]
    .sort((a, b) => grupo(a) - grupo(b) || a.ordem - b.ordem || a.id.localeCompare(b.id))
    .slice(0, limite)
    .map((q) => q.id);
}
