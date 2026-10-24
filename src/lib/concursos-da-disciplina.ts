/** Concursos de uma disciplina específica (usa concurso_ids; cai para o antigo concurso_id). */
export function concursosDaDisciplina(d: { concurso_id?: string | null; concurso_ids?: string[] | null }): string[] {
  if (d.concurso_ids?.length) return d.concurso_ids;
  return d.concurso_id ? [d.concurso_id] : [];
}

export function pertenceAoConcurso(
  d: { concurso_id?: string | null; concurso_ids?: string[] | null },
  concursoId: string,
): boolean {
  return concursosDaDisciplina(d).includes(concursoId);
}
