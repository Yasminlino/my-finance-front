import { ItemListaDto, ListaDto } from 'src/app/core/models/lista.model';
import {
  contarItens, csvDosItens, filtrarItens, ordenarItens, resumoDosItens, rotuloDosFeitos, separarPorFeito, textoDosPendentes, totalDoItem
} from './planejamento.regras';

function lista(ajuste: Partial<ListaDto> = {}): ListaDto {
  return {
    id: 1, nome: 'Mercado', usaQuantidade: true, usaValor: true, modoValor: 'UNITARIO', usaLimite: false,
    usaData: false, usaObservacao: false, modelo: 'COMPRAS', ...ajuste
  };
}

function item(ajuste: Partial<ItemListaDto>): ItemListaDto {
  return { id: 1, descricao: 'Arroz', feito: false, ...ajuste };
}

describe('planejamento.regras (card #66)', () => {
  describe('totalDoItem (igual ao resumo da API)', () => {
    it('UNITARIO: quantidade × valor (sem quantidade, 1)', () => {
      expect(totalDoItem(item({ quantidade: 2, valor: 6.5 }), lista())).toBe(13);
      expect(totalDoItem(item({ quantidade: null, valor: 6.5 }), lista())).toBe(6.5);
    });

    it('TOTAL: o valor já é o total', () => {
      expect(totalDoItem(item({ quantidade: 3, valor: 20 }), lista({ modoValor: 'TOTAL' }))).toBe(20);
    });

    it('sem valor: null (fica fora da soma)', () => {
      expect(totalDoItem(item({ quantidade: 2, valor: null }), lista())).toBeNull();
    });

    it('arredonda nos centavos', () => {
      expect(totalDoItem(item({ quantidade: 3, valor: 0.1 }), lista())).toBe(0.3);
    });
  });

  describe('resumoDosItens', () => {
    const itens = [
      item({ id: 1, quantidade: 2, valor: 6.5, feito: true }),
      item({ id: 2, quantidade: 1, valor: 10 }),
      item({ id: 3, quantidade: 1, valor: null }),
      item({ id: 4, quantidade: 4, valor: 0.25, feito: true })
    ];

    it('total, ok e falta fecham; itens sem valor ficam fora da soma, mas contam no progresso', () => {
      const r = resumoDosItens(itens, lista());

      expect(r.total).toBe(24);
      expect(r.ok).toBe(14);
      expect(r.falta).toBe(10);
      expect(r.ok + r.falta).toBe(r.total);
      expect(r.feitos).toBe(2);
      expect(r.itens).toBe(4);
      expect(r.percentual).toBe(50);
      expect(r.semValor).toBe(1);
      expect(r.disponivel).toBeNull();
    });

    it('com Limite: disponível = limite − total (pode ser negativo)', () => {
      expect(resumoDosItens(itens, lista({ usaLimite: true, limite: 20 })).disponivel).toBe(-4);
      expect(resumoDosItens(itens, lista({ usaLimite: true, limite: 100 })).disponivel).toBe(76);
    });

    it('sem itens: tudo zero', () => {
      expect(resumoDosItens([], lista())).toEqual(jasmine.objectContaining({ total: 0, itens: 0, percentual: 0 }));
    });
  });

  it('rotuloDosFeitos vem do modelo', () => {
    expect(rotuloDosFeitos('COMPRAS')).toBe('No carrinho');
    expect(rotuloDosFeitos('ORCAMENTO')).toBe('OK');
    expect(rotuloDosFeitos('TAREFAS')).toBe('Concluídas');
    expect(rotuloDosFeitos('AGENDA')).toBe('Concluídas');
    expect(rotuloDosFeitos('BRANCO')).toBe('Feitos');
  });

  describe('ordem, filtro e busca', () => {
    const itens = [
      item({ id: 5, descricao: 'Feijão', ordem: null }),
      item({ id: 2, descricao: 'Café', ordem: 2, feito: true }),
      item({ id: 9, descricao: 'Açúcar', ordem: 1 }),
      item({ id: 3, descricao: 'Leite', ordem: null, observacao: 'integral' })
    ];

    it('ordem de inclusão: ordem primeiro, depois id; não mexe no array', () => {
      const copia = [...itens];
      expect(ordenarItens(itens).map(i => i.id)).toEqual([9, 2, 3, 5]);
      expect(itens).toEqual(copia);
    });

    it('conta e filtra Falta / Feitos', () => {
      expect(contarItens(itens)).toEqual({ TODOS: 4, FALTA: 3, FEITOS: 1 });
      expect(filtrarItens(itens, 'FALTA', '').map(i => i.id)).toEqual([5, 9, 3]);
      expect(filtrarItens(itens, 'FEITOS', '').map(i => i.id)).toEqual([2]);
    });

    it('busca sem acento nem maiúscula, também na observação', () => {
      expect(filtrarItens(itens, 'TODOS', 'acucar').map(i => i.id)).toEqual([9]);
      expect(filtrarItens(itens, 'TODOS', 'INTEGRAL').map(i => i.id)).toEqual([3]);
    });

    it('separarPorFeito: pendentes e feitos, cada um na ordem de inclusão', () => {
      const { pendentes, feitos } = separarPorFeito(itens);
      expect(pendentes.map(i => i.id)).toEqual([9, 3, 5]);
      expect(feitos.map(i => i.id)).toEqual([2]);
    });
  });
});

describe('planejamento.regras — compartilhar e exportar (card #66, parte 2)', () => {
  const BOM = String.fromCharCode(0xfeff);
  const compras: ListaDto = {
    id: 8, nome: 'Mercado', usaQuantidade: true, usaValor: true, modoValor: 'UNITARIO', usaLimite: false,
    usaData: false, usaObservacao: false, modelo: 'COMPRAS'
  };
  const itens: ItemListaDto[] = [
    { id: 1, descricao: 'Arroz', feito: true, quantidade: 1, valor: 20 },
    { id: 2, descricao: 'Leite', feito: false, quantidade: 2, valor: 5 },
    { id: 3, descricao: 'Pão; francês', feito: false, quantidade: 6, valor: null }
  ];

  describe('textoDosPendentes', () => {
    it('nome, um ☐ por pendente com qtd e total, e o que falta', () => {
      expect(textoDosPendentes(compras, itens)).toBe(
        'Mercado\n☐ Leite × 2 — R$ 10,00\n☐ Pão; francês × 6\n\nFalta: R$ 10,00');
    });

    it('só os campos ligados (data e hora quando há)', () => {
      const agenda: ListaDto = { ...compras, usaQuantidade: false, usaValor: false, usaData: true, modelo: 'AGENDA' };
      expect(textoDosPendentes(agenda, [{ id: 1, descricao: 'Dentista', feito: false, data: '2026-11-03', hora: '14:30:00' }]))
        .toBe('Mercado\n☐ Dentista (03/11 14:30)');
    });

    it('com Valor ligado mas nenhum item com valor, não mostra "Falta"', () => {
      expect(textoDosPendentes(compras, [{ id: 1, descricao: 'Feijão', feito: false, quantidade: 1, valor: null }]))
        .toBe('Mercado\n☐ Feijão × 1');
    });

    it('sem pendentes avisa que está tudo feito', () => {
      expect(textoDosPendentes(compras, [itens[0]])).toBe('Mercado\nTudo feito!');
    });
  });

  describe('csvDosItens', () => {
    it('BOM, ; e só as colunas dos campos ligados; números no formato brasileiro; aspas quando precisa', () => {
      const linhas = csvDosItens(compras, itens).split('\r\n');

      expect(linhas[0]).toBe(BOM + 'Item;Feito;Quantidade;Valor unitário;Total');
      expect(linhas[1]).toBe('Leite;Não;2;5,00;10,00');
      expect(linhas[2]).toBe('"Pão; francês";Não;6;;');
      expect(linhas[3]).toBe('Arroz;Sim;1;20,00;20,00');
      expect(linhas.length).toBe(4);
    });

    it('modo total: uma coluna de valor; data, hora e observação quando ligadas', () => {
      const orcamento: ListaDto = { ...compras, usaQuantidade: false, modoValor: 'TOTAL', usaData: true, usaObservacao: true };
      const csv = csvDosItens(orcamento, [{ id: 1, descricao: 'Luz', feito: false, valor: 1234.5, data: '2026-11-10', hora: null, observacao: 'conta "verde"' }]);

      expect(csv.split('\r\n')).toEqual([
        BOM + 'Item;Feito;Valor;Data;Hora;Observação',
        'Luz;Não;1.234,50;10/11/2026;;"conta ""verde"""'
      ]);
    });
  });
});
