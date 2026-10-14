import { addMonthsToYearMonth } from '../utils/mask';
import { ContextoExtrato, paraExtratoItemDto } from './extrato.mapper';
import { ExtratoItemDto } from './extrato.model';
import { PessoaMovimentacaoDto } from './pessoa-movimentacao.model';

/** O que o formulário de lançamento manual entrega (valor já numérico, pela currencyInput). */
export interface LancamentoManualValores {
  dataMovimentacao: string;
  tipoLancamento: string;
  valor: number;
  categoriaId: number | null;
  /** Pessoa escolhida no autocomplete, ou o nome digitado. */
  pessoa: PessoaMovimentacaoDto | string | null;
  descricao: string | null;
  observacao: string | null;
  /** Fatura "YYYY-MM" do cartão de crédito; ignorada fora do crédito. */
  numeroFatura: string | null;
  parcelado: boolean;
  quantidadeParcelas: number;
  parcelaAtual: number;
  gerarTodasParcelas: boolean;
}

/** Banco e cartão do lançamento, as listas para resolver nomes e se o cartão é de crédito. */
export type ContextoLancamentoManual = Omit<ContextoExtrato, 'numeroFatura'> & { ehCredito: boolean };

function textoOuNulo(valor: string | null | undefined): string | null {
  const texto = (valor ?? '').trim();
  return texto ? texto : null;
}

/**
 * Itens a criar a partir de um lançamento manual — regra única do Resumo e do Detalhes (FE-P2-10):
 * um item; ou, no cartão de crédito parcelado, todas as parcelas a partir da atual (cada uma na
 * fatura do mês correspondente) ou só a parcela informada.
 */
export function montarLancamentosManuais(valores: LancamentoManualValores, contexto: ContextoLancamentoManual): ExtratoItemDto[] {
  const pessoa = valores.pessoa;
  const pessoaEscolhida = pessoa && typeof pessoa === 'object' ? pessoa : null;
  const nomeDigitado = typeof pessoa === 'string' ? textoOuNulo(pessoa)?.toUpperCase() ?? null : null;

  const base = paraExtratoItemDto({
    dataMovimentacao: valores.dataMovimentacao,
    valor: valores.valor,
    tipoLancamento: valores.tipoLancamento,
    categoriaId: valores.categoriaId,
    pessoaMovimentacaoId: pessoaEscolhida?.id ?? null,
    nomePessoaTransacao: pessoaEscolhida?.nomePessoa ?? nomeDigitado,
    descricao: textoOuNulo(valores.descricao),
    observacao: textoOuNulo(valores.observacao),
    numeroFatura: contexto.ehCredito ? valores.numeroFatura : null,
    ehParcelado: false,
  }, { ...contexto, numeroFatura: null });

  if (!contexto.ehCredito || !valores.parcelado) {
    return [base];
  }

  const quantidadeParcelas = Math.max(2, Number(valores.quantidadeParcelas) || 2);
  const parcelaAtual = Math.max(1, Number(valores.parcelaAtual) || 1);

  if (!valores.gerarTodasParcelas) {
    return [{ ...base, ehParcelado: true, parcelaAtual, quantidadeParcelas }];
  }

  const itens: ExtratoItemDto[] = [];
  for (let parcela = parcelaAtual; parcela <= quantidadeParcelas; parcela++) {
    itens.push({
      ...base,
      ehParcelado: true,
      parcelaAtual: parcela,
      quantidadeParcelas,
      numeroFatura: valores.numeroFatura ? addMonthsToYearMonth(valores.numeroFatura, parcela - parcelaAtual) : null
    });
  }
  return itens;
}
