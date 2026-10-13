import { parseCurrencyBR } from 'src/app/core/utils/mask';

/** De que lado do saldo um lançamento entra (FE-P1-09). */
export enum NaturezaLancamento {
  Receita = 'receita',
  Despesa = 'despesa'
}

export interface TotaisSelecao {
  receita: number;
  despesa: number;
  saldo: number;
  count: number;
}

/** Contas a Pagar: subcategoria da categoria ("Receita" | "Despesa"). */
export function naturezaPorSubCategoria(subCategoria: string | null | undefined): NaturezaLancamento | null {
  const s = (subCategoria ?? '').toLowerCase();
  if (s === 'receita' || s === 'receitas') return NaturezaLancamento.Receita;
  if (s === 'despesa' || s === 'despesas') return NaturezaLancamento.Despesa;
  return null;
}

/** Extrato: tipo de lançamento gravado pela API ("Entrada" | "Saída"). */
export function naturezaPorTipoLancamento(tipoLancamento: string | null | undefined): NaturezaLancamento | null {
  const s = (tipoLancamento ?? '').toLowerCase();
  if (s === 'entrada' || s === 'entradas') return NaturezaLancamento.Receita;
  if (s === 'saída' || s === 'saídas') return NaturezaLancamento.Despesa;
  return null;
}

/** Totais dos itens selecionados no grid; itens sem natureza só entram na contagem. */
export function calcularTotaisSelecao<T>(
  itens: T[],
  valorDe: (item: T) => unknown,
  naturezaDe: (item: T) => NaturezaLancamento | null
): TotaisSelecao {
  let receita = 0;
  let despesa = 0;

  for (const item of itens) {
    const valor = parseCurrencyBR(valorDe(item)) ?? 0;
    const natureza = naturezaDe(item);

    if (natureza === NaturezaLancamento.Receita) receita += valor;
    if (natureza === NaturezaLancamento.Despesa) despesa += valor;
  }

  return { receita, despesa, saldo: receita - despesa, count: itens.length };
}
