import {
  NaturezaLancamento,
  calcularTotaisSelecao,
  naturezaPorSubCategoria,
  naturezaPorTipoLancamento
} from './totais-selecao';

describe('naturezaPorSubCategoria', () => {
  it('reconhece receita e despesa, no singular e plural, sem diferenciar caixa', () => {
    expect(naturezaPorSubCategoria('Receita')).toBe(NaturezaLancamento.Receita);
    expect(naturezaPorSubCategoria('receitas')).toBe(NaturezaLancamento.Receita);
    expect(naturezaPorSubCategoria('Despesa')).toBe(NaturezaLancamento.Despesa);
    expect(naturezaPorSubCategoria('DESPESAS')).toBe(NaturezaLancamento.Despesa);
  });

  it('devolve null para o resto (ex.: Investimento) e vazio', () => {
    expect(naturezaPorSubCategoria('Investimento')).toBeNull();
    expect(naturezaPorSubCategoria(undefined)).toBeNull();
    expect(naturezaPorSubCategoria(null)).toBeNull();
  });
});

describe('naturezaPorTipoLancamento', () => {
  it('Entrada é receita e Saída é despesa (valores gravados pela API)', () => {
    expect(naturezaPorTipoLancamento('Entrada')).toBe(NaturezaLancamento.Receita);
    expect(naturezaPorTipoLancamento('entradas')).toBe(NaturezaLancamento.Receita);
    expect(naturezaPorTipoLancamento('Saída')).toBe(NaturezaLancamento.Despesa);
    expect(naturezaPorTipoLancamento('saídas')).toBe(NaturezaLancamento.Despesa);
  });

  it('devolve null para o resto e vazio', () => {
    expect(naturezaPorTipoLancamento('Desconto')).toBeNull();
    expect(naturezaPorTipoLancamento('')).toBeNull();
  });
});

describe('calcularTotaisSelecao', () => {
  type Linha = { valor: number | string; tipo: string };
  const valorDe = (l: Linha) => l.valor;
  const naturezaDe = (l: Linha) => naturezaPorTipoLancamento(l.tipo);

  it('soma receita e despesa, calcula saldo e conta todos os itens', () => {
    const linhas: Linha[] = [
      { valor: 1000, tipo: 'Entrada' },
      { valor: '250,50', tipo: 'Saída' },
      { valor: 'R$ 49,50', tipo: 'Saída' },
      { valor: 99, tipo: 'Desconto' }
    ];

    expect(calcularTotaisSelecao(linhas, valorDe, naturezaDe)).toEqual({
      receita: 1000,
      despesa: 300,
      saldo: 700,
      count: 4
    });
  });

  it('valor inválido conta como zero', () => {
    expect(calcularTotaisSelecao([{ valor: 'abc', tipo: 'Entrada' }], valorDe, naturezaDe))
      .toEqual({ receita: 0, despesa: 0, saldo: 0, count: 1 });
  });

  it('seleção vazia zera tudo', () => {
    expect(calcularTotaisSelecao([], valorDe, naturezaDe)).toEqual({ receita: 0, despesa: 0, saldo: 0, count: 0 });
  });
});
