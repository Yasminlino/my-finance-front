import { BancoDto } from 'src/app/core/models/banco.model';
import { ExtratoItemDto } from 'src/app/core/models/extrato.model';
import { TipoCartaoDto } from 'src/app/core/models/tipo-cartao.model';
import {
  FiltroExtrato, agruparPorDia, alteracoesDoRascunho, aplicarPessoa, campoAlterado, cardsDoExtrato, contasDoMes, ehEntrada,
  ehDoTitular, expandirPartes, faturaPorPessoa, filtrarExtrato, grupoUnico, moedaComSinal, nomeDaPessoa, nomesParaSugestao, opcoesDePessoa, ordenarExtrato, rascunhoDe, semPessoa, tituloCurtoDoDia, usaPessoas
} from './extrato.regras';

describe('título do dia no celular', () => {
  it('dia, mês curto e dia da semana', () => {
    expect(tituloCurtoDoDia('2026-10-22')).toBe('22 OUT · QUINTA');
  });
});

describe('lançamento dividido (card #76, fase 3)', () => {
  const dividida = (): ExtratoItemDto => item(1, '2026-10-05', 300, {
    partes: [{ valor: 200, categoriaId: 8, categoriaNome: 'Alimentação', categoriaNaturezaOperacao: 1 }, { valor: 100, categoriaId: 9, categoriaNome: 'Beleza', pessoaMovimentacaoId: 7, pessoaNome: 'CARLOS' }]
  });
  const base: FiltroExtrato = { bancoId: null, tipo: 'todos', busca: '', pessoas: [], categorias: [], pendencia: null };

  it('não conta como sem categoria, a não ser que falte em alguma parte', () => {
    expect(cardsDoExtrato([dividida()]).semCategoria).toBe(0);
    const faltando = item(2, '2026-10-05', 10, { partes: [{ valor: 5, categoriaId: 8 }, { valor: 5 }] });
    expect(cardsDoExtrato([faltando]).semCategoria).toBe(1);
    expect(cardsDoExtrato([dividida()]).saidas).toBe(300);
  });

  it('o filtro acha pela categoria e pela pessoa das partes', () => {
    expect(filtrarExtrato([dividida()], { ...base, categorias: [9] }).length).toBe(1);
    expect(filtrarExtrato([dividida()], { ...base, pessoas: ['Carlos'] }).length).toBe(1);
    expect(filtrarExtrato([dividida()], { ...base, categorias: [99] }).length).toBe(0);
  });

  it('relatório: cada parte vale na categoria dela; a soma não muda', () => {
    const lista = expandirPartes([dividida(), item(2, '2026-10-05', 10)]);
    expect(lista.map(i => [i.categoria?.nome, i.valor])).toEqual([['Alimentação', 200], ['Beleza', 100], [undefined, 10]]);
    expect(lista[0].categoria?.naturezaOperacao).toBe(1);
  });

  it('fatura por pessoa: só a parte da pessoa é dela', () => {
    const f = faturaPorPessoa([dividida()], [{ id: 7, nomePessoa: 'CARLOS' }]);
    expect(f.outras).toBe(100);
    expect(f.minhas).toBe(200);
    expect(f.total).toBe(300);
  });
});

describe('ordenar e filtrar por valor, como em Contas a Pagar', () => {
  const lista = (): ExtratoItemDto[] => [
    item(1, '2026-10-05', 30, { nomePessoaTransacao: 'ZEBRA' }),
    item(2, '2026-10-04', 100, { tipoLancamento: 'Entrada', nomePessoaTransacao: 'ANA' }),
    item(3, '2026-10-03', 50, { descricao: 'Mercado' })
  ];
  const ids = (l: ExtratoItemDto[]) => l.map(i => i.id);

  it('filtra pela faixa de valor', () => {
    const base: FiltroExtrato = { bancoId: null, tipo: 'todos', busca: '', pessoas: [], categorias: [], pendencia: null };
    expect(ids(filtrarExtrato(lista(), { ...base, valorMin: 40 }))).toEqual([2, 3]);
    expect(ids(filtrarExtrato(lista(), { ...base, valorMin: 40, valorMax: 60 }))).toEqual([3]);
  });

  it('ordena por data (padrão), entradas primeiro, maior valor e nome, sem mexer na original', () => {
    const original = lista();
    expect(ids(ordenarExtrato(original, 'data'))).toEqual([1, 2, 3]);
    expect(ids(ordenarExtrato(original, 'entradas'))).toEqual([2, 1, 3]);
    expect(ids(ordenarExtrato(original, 'valor'))).toEqual([2, 3, 1]);
    expect(ids(ordenarExtrato(original, 'nome'))).toEqual([2, 3, 1]);
    expect(ids(original)).toEqual([1, 2, 3]);
  });

  it('fora da ordem por data vira um grupo só, com o saldo de tudo', () => {
    const [grupo] = grupoUnico(lista(), 'Maior valor');
    expect(grupo.titulo).toBe('Maior valor');
    expect(grupo.saldo).toBe(20);
    expect(grupoUnico([], 'x')).toEqual([]);
  });
});

const item = (id: number, data: string, valor: number, extra: Partial<ExtratoItemDto> = {}): ExtratoItemDto => ({
  id, dataMovimentacao: data, valor, tipoLancamento: 'Saída', bancoId: 1, descricao: `Compra ${id}`, ...extra
});

/** Pessoa cadastrada no lançamento (card #79: pessoa é só a cadastrada, nunca o nome do extrato). */
const comPessoa = (id: number, nomePessoa: string): Partial<ExtratoItemDto> =>
  ({ pessoaMovimentacaoId: id, pessoaMovimentacao: { id, nomePessoa, categoriaId: null, tipoMovimentacaoId: null } });

/** Regras da tela de Extrato no layout novo (card #45, parte 1). */
describe('extrato.regras', () => {
  it('entrada aceita "Entrada" e "ENTRADA"; o resto é saída', () => {
    expect(ehEntrada({ tipoLancamento: 'Entrada' })).toBeTrue();
    expect(ehEntrada({ tipoLancamento: 'ENTRADA' })).toBeTrue();
    expect(ehEntrada({ tipoLancamento: 'Saída' })).toBeFalse();
    expect(ehEntrada({ tipoLancamento: 'SAIDA' })).toBeFalse();
  });

  it('sem pessoa: sem pessoa cadastrada, mesmo com nome do extrato (card #79)', () => {
    expect(semPessoa(item(1, '2026-10-01', 10))).toBeTrue();
    expect(semPessoa(item(1, '2026-10-01', 10, { nomePessoaTransacao: 'CIRCUITO' }))).toBeTrue();
    expect(semPessoa(item(1, '2026-10-01', 10, { pessoaMovimentacaoId: 3 }))).toBeFalse();
  });

  it('contas do mês: uma por banco, com tipo, crédito, entradas e saídas; em ordem de nome', () => {
    const bancos = [
      { id: 1, nomeBanco: 'Nubank', tipoCartaoId: 2 }, { id: 2, nomeBanco: 'Caixa', tipoCartaoId: 1 }, { id: 3, nomeBanco: 'Inter', tipoCartaoId: null }
    ] as BancoDto[];
    const tipos = [{ id: 1, nomeTipoCartao: 'Conta corrente', ehCredito: false }, { id: 2, nomeTipoCartao: 'Crédito', ehCredito: true }] as TipoCartaoDto[];
    const itens = [
      item(1, '2026-10-01', 100), item(2, '2026-10-02', 50, { tipoLancamento: 'Entrada' }),
      item(3, '2026-10-03', 30, { bancoId: 2 }), item(4, '2026-10-03', 1000, { bancoId: 2, tipoLancamento: 'Entrada' })
    ];

    expect(contasDoMes(itens, bancos, tipos)).toEqual([
      { bancoId: 2, nome: 'Caixa', tipoNome: 'Conta corrente', ehCredito: false, entradas: 1000, saidas: 30, quantidade: 2 },
      { bancoId: 3, nome: 'Inter', tipoNome: '', ehCredito: false, entradas: 0, saidas: 0, quantidade: 0 },
      { bancoId: 1, nome: 'Nubank', tipoNome: 'Crédito', ehCredito: true, entradas: 50, saidas: 100, quantidade: 2 }
    ]);
  });

  describe('filtrarExtrato', () => {
    const itens = [
      item(1, '2026-10-01', 100, { ...comPessoa(7, 'Carlos'), categoriaId: 5, descricao: 'Mercado Extra' }),
      item(2, '2026-10-05', 50, { tipoLancamento: 'Entrada', ...comPessoa(7, 'Carlos') }),
      item(3, '2026-10-05', 30, { bancoId: 2, categoriaId: 6, descricao: 'Compra', nomePessoaTransacao: 'Padaria São José' }),
      item(4, '2026-10-03', 20, { ...comPessoa(8, 'Ágatha'), descricao: 'DEBITO IOF' })
    ];
    const filtro: FiltroExtrato = { bancoId: null, tipo: 'todos', busca: '', pessoas: [], categorias: [], pendencia: null };
    const ids = (lista: ExtratoItemDto[]) => lista.map(i => i.id);

    it('sem filtro: tudo, do dia mais recente para o mais antigo (empate: maior id primeiro)', () => {
      expect(ids(filtrarExtrato(itens, filtro))).toEqual([3, 2, 4, 1]);
    });

    it('por conta, por tipo e pela busca sem acento (descrição ou pessoa)', () => {
      expect(ids(filtrarExtrato(itens, { ...filtro, bancoId: 2 }))).toEqual([3]);
      expect(ids(filtrarExtrato(itens, { ...filtro, tipo: 'entradas' }))).toEqual([2]);
      expect(ids(filtrarExtrato(itens, { ...filtro, tipo: 'saidas' }))).toEqual([3, 4, 1]);
      expect(ids(filtrarExtrato(itens, { ...filtro, busca: 'sao jose' }))).toEqual([3]);
      expect(ids(filtrarExtrato(itens, { ...filtro, busca: 'agatha' }))).toEqual([4]);
      expect(ids(filtrarExtrato([{ ...itens[0], id: 77, extratoBancarioId: 5 }, { ...itens[0], id: 78, extratoBancarioId: 6 }], { ...filtro, importacaoId: 5 }))).toEqual([77]);
      expect(ids(filtrarExtrato([...itens, { ...itens[0], id: 99, itensNota: ['Ração Golden'] }], { ...filtro, busca: 'racao' }))).toEqual([99]);
    });

    it('por pessoas e categorias', () => {
      expect(ids(filtrarExtrato(itens, { ...filtro, pessoas: ['Carlos'] }))).toEqual([2, 1]);
      expect(ids(filtrarExtrato(itens, { ...filtro, categorias: [6] }))).toEqual([3]);
    });

    it('pendências: saídas sem pessoa e lançamentos sem categoria', () => {
      expect(ids(filtrarExtrato(itens, { ...filtro, pendencia: 'sem-pessoa' }))).toEqual([3]);
      expect(ids(filtrarExtrato(itens, { ...filtro, pendencia: 'sem-categoria' }))).toEqual([2, 4]);
    });
  });

  it('cards: total de saídas e entradas, e quantos faltam classificar', () => {
    expect(cardsDoExtrato([
      item(1, '2026-10-01', 100, { ...comPessoa(7, 'Carlos'), categoriaId: 5 }),
      item(2, '2026-10-02', 50.5, { tipoLancamento: 'Entrada' }),
      item(3, '2026-10-03', 30)
    ])).toEqual({ saidas: 130, entradas: 50.5, semPessoa: 1, semCategoria: 2 });
  });

  it('agrupa por dia na ordem que veio, com título e o saldo do dia', () => {
    const grupos = agruparPorDia([
      item(1, '2026-10-05', 100), item(2, '2026-10-05', 40, { tipoLancamento: 'Entrada' }), item(3, '2026-10-01', 30)
    ]);

    expect(grupos.map(g => g.data)).toEqual(['2026-10-05', '2026-10-01']);
    expect(grupos[0].titulo).toBe('5 de outubro, segunda-feira');
    expect(grupos[0].saldo).toBe(-60);
    expect(grupos[0].itens.map(i => i.id)).toEqual([1, 2]);
  });

  it('Modo edição: só os lançamentos com algum campo editável mudado', () => {
    const originais = [item(1, '2026-10-01', 100), item(2, '2026-10-02', 50, { nomePessoaTransacao: 'Carlos' })];
    const rascunho = {
      1: { ...originais[0], categoriaId: 7 },
      2: { ...originais[1], nomePessoaTransacao: 'Carlos' }
    };

    expect(alteracoesDoRascunho(originais, rascunho).map(i => i.id)).toEqual([1]);
  });

  describe('Modo edição (item 3)', () => {
    it('rascunho: uma cópia por lançamento, com a data só com o dia', () => {
      const original = item(1, '2026-10-05T00:00:00', 10);
      const rascunho = rascunhoDe([original]);
      expect(rascunho[1].dataMovimentacao).toBe('2026-10-05');
      rascunho[1].descricao = 'Outra';
      expect(original.descricao).toBe('Compra 1');
      expect(alteracoesDoRascunho([original], rascunhoDe([original]))).toEqual([]);
    });

    it('campo alterado: a data compara só o dia; os outros, o valor', () => {
      const original = item(1, '2026-10-05T00:00:00', 10, { categoriaId: 2 });
      const editado = { ...rascunhoDe([original])[1] };
      expect(campoAlterado(original, editado, 'dataMovimentacao')).toBeFalse();
      editado.dataMovimentacao = '2026-10-06';
      editado.categoriaId = 3;
      expect(campoAlterado(original, editado, 'dataMovimentacao')).toBeTrue();
      expect(campoAlterado(original, editado, 'categoriaId')).toBeTrue();
      expect(campoAlterado(original, editado, 'valor')).toBeFalse();
      expect(campoAlterado(undefined, editado, 'valor')).toBeFalse();
    });

    it('pessoa escolhida pelo id (card #79): liga a cadastrada sem mexer no nome do extrato; null tira', () => {
      const pessoas = [{ id: 7, nomePessoa: 'GIOVANNE' }, { id: 8, nomePessoa: 'ÁGATA' }];
      const circuito = item(1, '2026-10-05', 10, { nomePessoaTransacao: 'CIRCUITO', categoriaId: 3 });
      expect(aplicarPessoa(circuito, 8, pessoas)).toEqual(jasmine.objectContaining({
        pessoaMovimentacaoId: 8, nomePessoaTransacao: 'CIRCUITO', categoriaId: 3, alteraVinculoPessoa: true
      }));
      expect(aplicarPessoa(circuito, 8, pessoas).pessoaMovimentacao?.nomePessoa).toBe('ÁGATA');
      expect(aplicarPessoa({ ...circuito, pessoaMovimentacaoId: 7 }, null, pessoas))
        .toEqual(jasmine.objectContaining({ pessoaMovimentacaoId: null, pessoaMovimentacao: null, nomePessoaTransacao: 'CIRCUITO' }));
      expect(aplicarPessoa(circuito, 99, pessoas).pessoaMovimentacaoId).toBeNull();
    });

    it('opções de pessoa: "Eu" primeiro e as outras em ordem', () => {
      expect(opcoesDePessoa([{ id: 7, nomePessoa: 'CARLOS' }, { id: 1, nomePessoa: 'EU', ehTitular: true }, { id: 8, nomePessoa: 'ÁGATA' }]))
        .toEqual([{ label: 'Eu', value: 1 }, { label: 'ÁGATA', value: 8 }, { label: 'CARLOS', value: 7 }]);
    });

    it('usa pessoas só com algum cartão compartilhado (card #79)', () => {
      expect(usaPessoas([{ compartilhado: false }, {}])).toBeFalse();
      expect(usaPessoas([{ compartilhado: false }, { compartilhado: true }])).toBeTrue();
      expect(usaPessoas([])).toBeFalse();
    });
  });

  describe('pessoa "Eu" (parte 2)', () => {
    it('mostra "Eu" para a titular; o nome do extrato nunca é pessoa (card #79)', () => {
      const comObjeto = item(2, '2026-10-05', 10, { pessoaMovimentacaoId: 1, pessoaMovimentacao: { id: 1, nomePessoa: 'EU', ehTitular: true, categoriaId: null, tipoMovimentacaoId: null } });
      const outra = item(3, '2026-10-05', 10, { pessoaMovimentacaoId: 7, nomePessoaTransacao: 'CIRCUITO', pessoaMovimentacao: { id: 7, nomePessoa: 'EUGÊNIA', categoriaId: null, tipoMovimentacaoId: null } });
      const soNomeDoExtrato = item(4, '2026-10-05', 10, { nomePessoaTransacao: 'EU' });
      expect(ehDoTitular(comObjeto)).toBeTrue();
      expect(ehDoTitular(outra)).toBeFalse();
      expect(ehDoTitular(soNomeDoExtrato)).toBeFalse();
      expect(nomeDaPessoa(comObjeto)).toBe('Eu');
      expect(nomeDaPessoa(outra)).toBe('EUGÊNIA');
      expect(nomeDaPessoa(soNomeDoExtrato)).toBe('');
      expect(semPessoa(soNomeDoExtrato)).toBeTrue();
    });

    it('nas sugestões e na ordem, a titular vem primeiro como "Eu"', () => {
      expect(nomesParaSugestao([{ id: 7, nomePessoa: 'CARLOS' }, { id: 1, nomePessoa: 'EU', ehTitular: true }, { id: 8, nomePessoa: 'ÁGATA' }]))
        .toEqual(['Eu', 'ÁGATA', 'CARLOS']);
    });
  });
});

/** Card "Fatura dividida por pessoa" (card #45, parte 3, item 6). */
describe('faturaPorPessoa', () => {
  it('minhas compras × de outras pessoas (toda pessoa menos o "Eu"), por pessoa, sem as entradas', () => {
    const pessoas = [
      { id: 1, nomePessoa: 'EU', ehTitular: true }, { id: 7, nomePessoa: 'CARLOS' }, { id: 8, nomePessoa: 'ÁGATHA' }
    ];
    const itens = [
      item(1, '2026-10-01', 100, { pessoaMovimentacaoId: 7 }), item(2, '2026-10-02', 50, { pessoaMovimentacaoId: 7 }),
      item(3, '2026-10-03', 30, { pessoaMovimentacaoId: 8 }), item(4, '2026-10-04', 200, { nomePessoaTransacao: 'MERCADO X' }),
      item(5, '2026-10-05', 12, { pessoaMovimentacaoId: 1 }), item(6, '2026-10-06', 8),
      item(7, '2026-10-07', 400, { tipoLancamento: 'Entrada', pessoaMovimentacaoId: 7 })
    ];

    const f = faturaPorPessoa(itens, pessoas);

    expect(f).toEqual({
      total: 400, minhas: 220, outras: 180,
      porPessoa: [{ pessoaId: 7, nome: 'CARLOS', valor: 150 }, { pessoaId: 8, nome: 'ÁGATHA', valor: 30 }]
    });
  });
});

/** Card #81: sinal espaçado igual nos dois lados. */
describe('moedaComSinal', () => {
  it('"+ R$" e "- R$", zero sem sinal', () => {
    const t = (v: number) => moedaComSinal(v).replace(/\s/g, ' ');
    expect(t(150)).toBe('+ R$ 150,00');
    expect(t(-75.76)).toBe('- R$ 75,76');
    expect(t(0)).toBe('R$ 0,00');
  });
});
