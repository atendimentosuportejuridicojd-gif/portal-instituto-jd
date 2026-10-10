/** Funções puras usadas pela lista que se reordena arrastando (ver SortableList). */

/** Devolve uma cópia da lista com o item de `de` movido para a posição `para` (limitada às pontas). */
export function moverItem<T>(lista: readonly T[], de: number, para: number): T[] {
  if (de < 0 || de >= lista.length) return [...lista];
  const alvo = Math.max(0, Math.min(lista.length - 1, para));
  if (alvo === de) return [...lista];
  const nova = [...lista];
  const [item] = nova.splice(de, 1);
  nova.splice(alvo, 0, item);
  return nova;
}

export interface Retangulo {
  top: number;
  height: number;
}

/**
 * Posição em que o item arrastado ficaria: quantos dos OUTROS itens têm o centro acima do centro do item arrastado.
 * `retangulos` são as posições de todos os itens quando o arrasto começou.
 */
export function indiceAlvo(retangulos: readonly Retangulo[], indiceArrastado: number, centroArrastado: number): number {
  let acima = 0;
  retangulos.forEach((r, i) => {
    if (i !== indiceArrastado && r.top + r.height / 2 < centroArrastado) acima++;
  });
  return acima;
}

/**
 * Deslocamento vertical (em px) de um item que NÃO está sendo arrastado, para abrir espaço enquanto o outro passa.
 * `passo` = altura do item arrastado mais o espaço entre itens.
 */
export function deslocamento(indice: number, de: number, alvo: number, passo: number): number {
  if (indice === de) return 0;
  if (de < alvo && indice > de && indice <= alvo) return -passo;
  if (de > alvo && indice >= alvo && indice < de) return passo;
  return 0;
}
