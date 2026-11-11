import { ClassificarNomeDto, NomeExtratoDto } from 'src/app/core/models/nomes-extrato.model';
import { normalizarTexto } from '../classificacao.regras';

/** Card #79 — regras puras da aba "Nomes do extrato". */

export type AbaNomes = 'classificar' | 'semelhanca' | 'classificados' | 'todos';

export const ABAS_NOMES: { label: string; value: AbaNomes }[] = [
  { label: 'Para classificar', value: 'classificar' },
  { label: 'Por semelhança', value: 'semelhanca' },
  { label: 'Classificados', value: 'classificados' },
  { label: 'Todos', value: 'todos' }
];

/** O que o nome recebe: categoria e tipo. */
export type Classificacao = { categoriaId: number | null; tipoMovimentacaoId: number | null };

export type FiltroNomes = { aba: AbaNomes; busca: string; categoriaId: number | null };

const abaDe = (n: NomeExtratoDto): Exclude<AbaNomes, 'todos'> =>
  n.cobertura === 'nenhuma' ? 'classificar' : n.cobertura === 'semelhanca' ? 'semelhanca' : 'classificados';

export function contagens(nomes: readonly NomeExtratoDto[]): Record<AbaNomes, number> {
  const c: Record<AbaNomes, number> = { classificar: 0, semelhanca: 0, classificados: 0, todos: nomes.length };
  for (const n of nomes) c[abaDe(n)]++;
  return c;
}

/** Como o nome está agora: o que foi mexido na tela, senão o que a regra dá. */
export function atual(n: NomeExtratoDto, rascunho: Readonly<Record<string, Classificacao>>): Classificacao {
  return rascunho[n.texto] ?? { categoriaId: n.categoriaId, tipoMovimentacaoId: n.tipoMovimentacaoId };
}

export function filtrarNomes(
  nomes: readonly NomeExtratoDto[], filtro: FiltroNomes, rascunho: Readonly<Record<string, Classificacao>>
): NomeExtratoDto[] {
  const termo = normalizarTexto(filtro.busca);
  return nomes.filter(n =>
    (filtro.aba === 'todos' || abaDe(n) === filtro.aba)
    && (!termo || normalizarTexto(n.texto).includes(termo))
    && (filtro.categoriaId == null || atual(n, rascunho).categoriaId === filtro.categoriaId));
}

/**
 * O que vai para a API: nomes mexidos com categoria ou tipo diferente da regra de hoje. O "por semelhança" mexido e
 * mantido também vai (confirmar vira regra "igual a"). Em ordem de nome.
 */
export function alteracoes(nomes: readonly NomeExtratoDto[], rascunho: Readonly<Record<string, Classificacao>>): ClassificarNomeDto[] {
  return nomes
    .filter(n => rascunho[n.texto])
    .map(n => ({ n, r: rascunho[n.texto] }))
    .filter(({ r }) => r.categoriaId != null || r.tipoMovimentacaoId != null)
    .filter(({ n, r }) => n.cobertura === 'semelhanca' || n.cobertura === 'nenhuma'
      || r.categoriaId !== n.categoriaId || r.tipoMovimentacaoId !== n.tipoMovimentacaoId)
    .map(({ n, r }) => ({ texto: n.texto, categoriaId: r.categoriaId, tipoMovimentacaoId: r.tipoMovimentacaoId }))
    .sort((a, b) => a.texto.localeCompare(b.texto, 'pt-BR'));
}

/** Escolher a categoria: se é a sugerida e ainda não há tipo, o tipo sugerido vem junto. */
export function comCategoria(n: NomeExtratoDto, agora: Classificacao, categoriaId: number | null): Classificacao {
  const tipo = agora.tipoMovimentacaoId
    ?? (categoriaId != null && categoriaId === n.sugestaoCategoriaId ? n.sugestaoTipoMovimentacaoId : null);
  return { categoriaId, tipoMovimentacaoId: tipo };
}

/** Lote: o que vier preenchido (categoria e/ou tipo) vale para todos os escolhidos. */
export function aplicarEmLote(
  nomes: readonly NomeExtratoDto[], rascunho: Readonly<Record<string, Classificacao>>, textos: readonly string[], valor: Classificacao
): Record<string, Classificacao> {
  const novo = { ...rascunho };
  for (const n of nomes.filter(x => textos.includes(x.texto))) {
    const agora = atual(n, novo);
    novo[n.texto] = {
      categoriaId: valor.categoriaId ?? agora.categoriaId,
      tipoMovimentacaoId: valor.tipoMovimentacaoId ?? agora.tipoMovimentacaoId
    };
  }
  return novo;
}

/** A sugestão (tracejado com ✓) só aparece em nome sem regra exata, quando ainda não foi aceita. */
export function sugestaoVisivel(n: NomeExtratoDto, agora: Classificacao): boolean {
  return (n.cobertura === 'nenhuma' || n.cobertura === 'semelhanca') && n.sugestaoCategoriaId != null
    && agora.categoriaId !== n.sugestaoCategoriaId;
}

/** "12 lançamentos · último em 03/11" ou "1 lançamento · parecido com BAR DOIS IRMAOS". */
export function contexto(n: NomeExtratoDto): string {
  const qtd = `${n.lancamentos} ${n.lancamentos === 1 ? 'lançamento' : 'lançamentos'}`;
  if (n.cobertura === 'semelhanca' && n.regraTexto) return `${qtd} · parecido com ${n.regraTexto}`;
  const [, mes, dia] = (n.ultimoUso ?? '').slice(0, 10).split('-');
  return dia ? `${qtd} · último em ${dia}/${mes}` : qtd;
}
