import { useMemo } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { alunoSessoesEmAndamento } from "@/lib/questoes.functions";

export const CHAVE_SESSOES_ANDAMENTO = ["aluno", "sessoes-andamento"] as const;

export interface SessaoEmAndamento {
  material_id: string;
  do_cronograma?: boolean;
  respondidas: number;
  total: number;
}

const chave = (materialId: string, doCronograma: boolean) => `${doCronograma ? "c" : "a"}:${materialId}`;

/**
 * Matérias em que o aluno começou a resolver questões e não terminou. Sessões do cronograma e do acervo são
 * separadas: um botão do cronograma só enxerga sessões abertas pelo cronograma, e vice-versa.
 */
export function useSessoesEmAndamento() {
  const fn = useServerFn(alunoSessoesEmAndamento);
  const q = useQuery({ queryKey: CHAVE_SESSOES_ANDAMENTO, queryFn: () => fn(), staleTime: 15_000 });
  const mapa = useMemo(() => {
    const m = new Map<string, SessaoEmAndamento>();
    for (const s of q.data ?? [])
      if (s.respondidas > 0 && s.respondidas < s.total) m.set(chave(s.material_id, !!s.do_cronograma), s);
    return m;
  }, [q.data]);
  return {
    emAndamento: (materialId: string, doCronograma = false) => mapa.get(chave(materialId, doCronograma)) ?? null,
  };
}
