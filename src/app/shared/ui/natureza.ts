import { NaturezaOperacao } from '../enums/natureza-operacao.enum';

const NATUREZAS = new Set<number>(Object.values(NaturezaOperacao).filter((v): v is number => typeof v === 'number'));

/**
 * Classe de cor da natureza da categoria (card #27): mf-natureza-0 … mf-natureza-5, definidas em
 * src/styles/_components.scss a partir dos tokens. Natureza desconhecida usa a neutra.
 */
export function classeDaNatureza(natureza: number | null | undefined): string {
  return natureza != null && NATUREZAS.has(natureza) ? `mf-natureza-${natureza}` : 'mf-natureza-neutra';
}
