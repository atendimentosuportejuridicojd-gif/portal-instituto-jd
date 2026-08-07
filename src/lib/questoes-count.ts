/**
 * Conta questões por material sem sofrer o limite padrão de linhas do PostgREST
 * (1000 por requisição). Sem a paginação abaixo, materiais no fim da lista
 * apareciam com "0 questões" mesmo tendo questões cadastradas.
 */
export async function contarQuestoesPorMaterial(
  supabase: any,
  opts?: { somentePublicadas?: boolean },
): Promise<Map<string, number>> {
  const contagem = new Map<string, number>();
  const tamanho = 1000;
  for (let inicio = 0; ; inicio += tamanho) {
    let query = supabase.from("questoes").select("material_id");
    if (opts?.somentePublicadas) query = query.eq("publicado", true);
    const { data, error } = await query.range(inicio, inicio + tamanho - 1);
    if (error) throw new Error(error.message);
    const linhas = data ?? [];
    for (const linha of linhas) {
      if (!linha.material_id) continue;
      contagem.set(linha.material_id, (contagem.get(linha.material_id) ?? 0) + 1);
    }
    if (linhas.length < tamanho) break;
  }
  return contagem;
}
