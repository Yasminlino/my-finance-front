import { ContextoLancamentoManual, LancamentoManualValores, montarLancamentosManuais } from './lancamento-manual';

/**
 * Lançamento manual do Extrato (Resumo e Detalhes, FE-P2-10): uma regra só para montar os itens.
 * Antes o Resumo não mandava numeroFatura e registrava só uma parcela; o Detalhes gravava
 * "só a parcela informada" sempre como 1/N e mandava fatura até em conta corrente.
 */
describe('montarLancamentosManuais', () => {
  const contaCorrente: ContextoLancamentoManual = {
    categorias: [{ id: 29, nome: 'Alimentação' }],
    tiposMovimentacao: [],
    bancoId: 5,
    tipoCartaoId: 2,
    ehCredito: false
  };
  const cartao: ContextoLancamentoManual = { ...contaCorrente, bancoId: 18, tipoCartaoId: 1, ehCredito: true };

  const valores = (extra: Partial<LancamentoManualValores> = {}): LancamentoManualValores => ({
    dataMovimentacao: '2026-12-05',
    tipoLancamento: 'Saída',
    valor: 15.5,
    categoriaId: 29,
    pessoa: 'padaria do zé',
    descricao: '',
    observacao: '',
    numeroFatura: '2026-12',
    parcelado: false,
    quantidadeParcelas: 2,
    parcelaAtual: 1,
    gerarTodasParcelas: true,
    ...extra
  });

  it('lançamento simples em conta corrente: um item, sem fatura', () => {
    const [item, ...resto] = montarLancamentosManuais(valores(), contaCorrente);

    expect(resto.length).toBe(0);
    expect(item.dataMovimentacao).toBe('2026-12-05');
    expect(item.valor).toBe(15.5);
    expect(item.tipoLancamento).toBe('Saída');
    expect(item.bancoId).toBe(5);
    expect(item.tipoCartaoId).toBe(2);
    expect(item.categoriaId).toBe(29);
    expect(item.categoriaNome).toBe('Alimentação');
    expect(item.numeroFatura).toBeNull();
    expect(item.ehParcelado).toBeFalse();
    expect((item as any).id).toBeUndefined();
  });

  it('pessoa digitada vai em maiúsculas como nome; vazios viram null', () => {
    const [item] = montarLancamentosManuais(valores({ pessoa: '  padaria do zé ', descricao: '  ', observacao: '' }), contaCorrente);

    expect(item.nomePessoaTransacao).toBe('PADARIA DO ZÉ');
    expect(item.pessoaMovimentacaoId).toBeNull();
    expect(item.descricao).toBeNull();
    expect(item.observacao).toBeNull();
  });

  it('pessoa escolhida no autocomplete vai com id e nome, como o Detalhes já mandava', () => {
    const [item] = montarLancamentosManuais(valores({ pessoa: { id: 239, nomePessoa: 'PADARIA' } as any }), contaCorrente);

    expect(item.pessoaMovimentacaoId).toBe(239);
    expect(item.nomePessoaTransacao).toBe('PADARIA');
  });

  it('cartão à vista: um item na fatura informada', () => {
    const itens = montarLancamentosManuais(valores({ numeroFatura: '2027-01' }), cartao);

    expect(itens.length).toBe(1);
    expect(itens[0].numeroFatura).toBe('2027-01');
    expect(itens[0].bancoId).toBe(18);
    expect(itens[0].ehParcelado).toBeFalse();
  });

  it('cartão parcelado gerando todas: uma parcela por fatura, a partir da atual', () => {
    const itens = montarLancamentosManuais(valores({ parcelado: true, quantidadeParcelas: 4, parcelaAtual: 2 }), cartao);

    expect(itens.map(i => [i.parcelaAtual, i.quantidadeParcelas, i.numeroFatura])).toEqual([
      [2, 4, '2026-12'],
      [3, 4, '2027-01'],
      [4, 4, '2027-02']
    ]);
    expect(itens.every(i => i.ehParcelado && i.valor === 15.5)).toBeTrue();
  });

  it('cartão parcelado sem gerar todas: só a parcela informada', () => {
    const itens = montarLancamentosManuais(
      valores({ parcelado: true, quantidadeParcelas: 6, parcelaAtual: 3, gerarTodasParcelas: false }), cartao);

    expect(itens.length).toBe(1);
    expect(itens[0].parcelaAtual).toBe(3);
    expect(itens[0].quantidadeParcelas).toBe(6);
    expect(itens[0].numeroFatura).toBe('2026-12');
  });

  it('em conta corrente o "parcelado" é ignorado', () => {
    const itens = montarLancamentosManuais(valores({ parcelado: true, quantidadeParcelas: 3 }), contaCorrente);

    expect(itens.length).toBe(1);
    expect(itens[0].ehParcelado).toBeFalse();
  });
});
