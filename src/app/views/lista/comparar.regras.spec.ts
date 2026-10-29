import { ComparacaoListasDto, ItemComparadoDto } from 'src/app/core/models/lista.model';
import {
  barrasDaCascata, contarFiltros, csvDaComparacao, filtrarComparacao, itensDoGrupo, percentualComSinal, tagsDoItem
} from './comparar.regras';

const BOM = String.fromCharCode(0xfeff);

function item(ajuste: Partial<ItemComparadoDto>): ItemComparadoDto {
  return { descricao: 'X', diferenca: 0, mudancas: [], anterior: { quantidade: 1, valor: 10, total: 10 }, atual: { quantidade: 1, valor: 10, total: 10 }, ...ajuste };
}

const itens: ItemComparadoDto[] = [
  item({ descricao: 'Café', diferenca: 4, percentual: 20, mudancas: ['PRECO_SUBIU'], anterior: { quantidade: 1, valor: 20, total: 20 }, atual: { quantidade: 1, valor: 24, total: 24 } }),
  item({ descricao: 'Arroz', diferenca: 12, percentual: 100, mudancas: ['QUANTIDADE'], anterior: { quantidade: 1, valor: 12, total: 12 }, atual: { quantidade: 2, valor: 12, total: 24 } }),
  item({ descricao: 'Leite', diferenca: -1, percentual: -10, mudancas: ['PRECO_CAIU'], anterior: { quantidade: 2, valor: 5, total: 10 }, atual: { quantidade: 2, valor: 4.5, total: 9 } }),
  item({ descricao: 'Pão', diferenca: 8, mudancas: ['NOVO'], anterior: null, atual: { quantidade: 4, valor: 2, total: 8 } }),
  item({ descricao: 'Biscoito', diferenca: -6, mudancas: ['SAIU'], anterior: { quantidade: 1, valor: 6, total: 6 }, atual: null }),
  item({ descricao: 'Sal', diferenca: 0, mudancas: [] })
];

const comparacao: ComparacaoListasDto = {
  anterior: { id: 1, nome: 'Compras · out/2026', total: 58 },
  atual: { id: 2, nome: 'Compras · nov/2026', total: 75 },
  diferenca: 17,
  percentual: 29.31,
  efeitos: { preco: 3, quantidade: 12, novos: 8, sairam: 6 },
  itens,
  destaques: {},
  semValor: []
};

describe('comparar.regras (card #68)', () => {
  describe('filtros', () => {
    it('contadores batem com cada filtro', () => {
      expect(contarFiltros(itens)).toEqual({ MUDANCA: 5, SUBIU: 2, CAIU: 1, NOVOS: 1, SAIRAM: 1, TODOS: 6 });
    });

    it('subiu e caiu não contam novos e saíram; busca sem acento', () => {
      expect(filtrarComparacao(itens, 'SUBIU', '').map(i => i.descricao)).toEqual(['Café', 'Arroz']);
      expect(filtrarComparacao(itens, 'CAIU', '').map(i => i.descricao)).toEqual(['Leite']);
      expect(filtrarComparacao(itens, 'TODOS', 'PAO').map(i => i.descricao)).toEqual(['Pão']);
      expect(filtrarComparacao(itens, 'MUDANCA', '').map(i => i.descricao)).not.toContain('Sal');
    });
  });

  describe('barrasDaCascata', () => {
    it('anterior → preço → quantidade → novos → saíram → atual, e fecha no total atual', () => {
      const barras = barrasDaCascata(comparacao);

      expect(barras.map(b => [b.chave, b.inicio, b.fim])).toEqual([
        ['anterior', 0, 58], ['preco', 58, 61], ['quantidade', 61, 73], ['novos', 73, 81], ['sairam', 81, 75], ['atual', 0, 75]
      ]);
      expect(barras.map(b => b.tipo)).toEqual(['total', 'sobe', 'sobe', 'sobe', 'desce', 'total']);
      expect(barras[4].valor).toBe(-6);
    });

    it('efeito zero vira barra neutra', () => {
      const barras = barrasDaCascata({ ...comparacao, efeitos: { preco: 0, quantidade: 12, novos: 8, sairam: 6 }, diferenca: 14, atual: { ...comparacao.atual, total: 72 } });
      expect(barras[1].tipo).toBe('zero');
    });
  });

  it('itensDoGrupo dá os itens de cada barra (para o tooltip)', () => {
    expect(itensDoGrupo(itens, 'preco').map(i => i.descricao)).toEqual(['Café', 'Leite']);
    expect(itensDoGrupo(itens, 'quantidade').map(i => i.descricao)).toEqual(['Arroz']);
    expect(itensDoGrupo(itens, 'novos').map(i => i.descricao)).toEqual(['Pão']);
    expect(itensDoGrupo(itens, 'sairam').map(i => i.descricao)).toEqual(['Biscoito']);
  });

  it('tagsDoItem: preço, quantidade de → para, novo e saiu', () => {
    expect(tagsDoItem(itens[0])).toEqual([{ rotulo: 'Preço ↑', tom: 'sobe' }]);
    expect(tagsDoItem(itens[1])).toEqual([{ rotulo: 'Qtd 1→2', tom: 'neutro' }]);
    expect(tagsDoItem(itens[2])).toEqual([{ rotulo: 'Preço ↓', tom: 'desce' }]);
    expect(tagsDoItem(itens[3])).toEqual([{ rotulo: 'Novo', tom: 'novo' }]);
    expect(tagsDoItem(itens[4])).toEqual([{ rotulo: 'Saiu', tom: 'saiu' }]);
  });

  it('percentualComSinal: seta e sinal, não só cor', () => {
    expect(percentualComSinal(29.31)).toBe('▲ +29,3%');
    expect(percentualComSinal(-10)).toBe('▼ −10,0%');
    expect(percentualComSinal(0)).toBe('0,0%');
    expect(percentualComSinal(null)).toBe('—');
  });

  it('CSV com BOM, ; e as linhas recebidas', () => {
    const linhas = csvDaComparacao(comparacao, [itens[0], itens[3]]).split('\r\n');

    expect(linhas[0]).toBe(BOM + 'Item;Qtd anterior;Valor anterior;Total anterior;Qtd atual;Valor atual;Total atual;Diferença;%;Mudanças');
    expect(linhas[1]).toBe('Café;1;20,00;20,00;1;24,00;24,00;4,00;20,0;Preço ↑');
    expect(linhas[2]).toBe('Pão;;;;4;2,00;8,00;8,00;;Novo');
  });
});
