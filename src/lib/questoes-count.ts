/**
 * Conta questões por material com uma única agregação no banco.
 * Antes isso era feito baixando todas as questões em páginas de 1000 linhas,
 * o que estourava o tempo limite da consulta quando o acervo cresceu.
 */
export async function contarQuestoesPorMaterial(
  supabase: any,
  opts?: { somentePublicadas?: boolean },
): Promise<Map<string, number>> {
  const { data, error } = await supabase.rpc("contar_questoes_por_material", {
    _somente_publicadas: opts?.somentePublicadas ?? false,
  });
  if (error) throw new Error(error.message);
  const contagem = new Map<string, number>();
  for (const linha of data ?? []) {
    if (!linha.material_id) continue;
    contagem.set(linha.material_id, Number(linha.total) || 0);
  }
  return contagem;
}
