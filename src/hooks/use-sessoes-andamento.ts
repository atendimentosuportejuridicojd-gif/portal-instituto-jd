import { useMemo } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { alunoSessoesEmAndamento } from "@/lib/questoes.functions";

export const CHAVE_SESSOES_ANDAMENTO = ["aluno", "sessoes-andamento"] as const;

export interface SessaoEmAndamento {
  material_id: string;
  respondidas: number;
  total: number;
}

/**
 * Matérias em que o aluno começou a resolver questões e não terminou. Uma única consulta, compartilhada por todos
 * os botões de questões da tela. Só conta como "em andamento" quando já respondeu pelo menos uma questão.
 */
export function useSessoesEmAndamento() {
  const fn = useServerFn(alunoSessoesEmAndamento);
  const q = useQuery({ queryKey: CHAVE_SESSOES_ANDAMENTO, queryFn: () => fn(), staleTime: 15_000 });
  const mapa = useMemo(() => {
    const m = new Map<string, SessaoEmAndamento>();
    for (const s of q.data ?? []) if (s.respondidas > 0 && s.respondidas < s.total) m.set(s.material_id, s);
    return m;
  }, [q.data]);
  return { emAndamento: (materialId: string) => mapa.get(materialId) ?? null };
}
