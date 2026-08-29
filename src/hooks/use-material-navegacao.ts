import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { alunoListMateriaisComProgresso } from "@/lib/questoes.functions";

/**
 * Navegação contextual de um material: volta para a disciplina de origem
 * e aponta para a próxima matéria da mesma disciplina/módulo.
 */
export function useMaterialNavegacao(materialId: string) {
  const matsFn = useServerFn(alunoListMateriaisComProgresso);
  const q = useQuery({ queryKey: ["aluno", "acervo"], queryFn: () => matsFn() });

  const lista: any[] = q.data ?? [];
  const atual = lista.find((m) => m.id === materialId) ?? null;

  const disciplinaId: string | null = atual?.disciplina_id ?? null;

  const irmaos = atual
    ? lista.filter(
        (m) =>
          m.disciplina_id === atual.disciplina_id &&
          (atual.modulo_id ? m.modulo_id === atual.modulo_id : !m.modulo_id),
      )
    : [];

  const pos = irmaos.findIndex((m) => m.id === materialId);
  const proxima = pos >= 0 && pos < irmaos.length - 1 ? irmaos[pos + 1] : null;

  return {
    loading: q.isLoading,
    atual,
    disciplinaId,
    disciplinaNome: (atual?.disciplina as string | undefined) ?? null,
    proxima,
  };
}
