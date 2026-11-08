import { BancoDto } from 'src/app/core/models/banco.model';
import { ExtratoItemDto } from 'src/app/core/models/extrato.model';
import { TipoCartaoDto } from 'src/app/core/models/tipo-cartao.model';
import {
  FiltroExtrato, agruparPorDia, alteracoesDoRascunho, aplicarPessoa, campoAlterado, cardsDoExtrato, contasDoMes, ehEntrada,
  ehDoTitular, faturaPorPessoa, filtrarExtrato, grupoUnico, nomeDaPessoa, nomesParaSugestao, ordenarExtrato, rascunhoDe, semPessoa
} from './extrato.regras';

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

/** Regras da tela de Extrato no layout novo (card #45, parte 1). */
describe('extrato.regras', () => {
  it('entrada aceita "Entrada" e "ENTRADA"; o resto é saída', () => {
    expect(ehEntrada({ tipoLancamento: 'Entrada' })).toBeTrue();
    expect(ehEntrada({ tipoLancamento: 'ENTRADA' })).toBeTrue();
    expect(ehEntrada({ tipoLancamento: 'Saída' })).toBeFalse();
    expect(ehEntrada({ tipoLancamento: 'SAIDA' })).toBeFalse();
  });

  it('sem pessoa: nem vínculo nem nome', () => {
    expect(semPessoa(item(1, '2026-10-01', 10))).toBeTrue();
    expect(semPessoa(item(1, '2026-10-01', 10, { nomePessoaTransacao: '  ' }))).toBeTrue();
    expect(semPessoa(item(1, '2026-10-01', 10, { nomePessoaTransacao: 'Carlos' }))).toBeFalse();
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
      item(1, '2026-10-01', 100, { nomePessoaTransacao: 'Carlos', categoriaId: 5, descricao: 'Mercado Extra' }),
      item(2, '2026-10-05', 50, { tipoLancamento: 'Entrada', nomePessoaTransacao: 'Carlos' }),
      item(3, '2026-10-05', 30, { bancoId: 2, categoriaId: 6, descricao: 'Padaria São José' }),
      item(4, '2026-10-03', 20, { nomePessoaTransacao: 'Ágatha', descricao: 'DEBITO IOF' })
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
      item(1, '2026-10-01', 100, { nomePessoaTransacao: 'Carlos', categoriaId: 5 }),
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

    it('pessoa digitada: cadastrada liga pelo id (sem diferenciar acento e maiúscula); nova fica só o nome; vazio tira', () => {
      const pessoas = [{ id: 7, nomePessoa: 'Giovanne' }, { id: 8, nomePessoa: 'Ágata' }];
      expect(aplicarPessoa(item(1, '2026-10-05', 10), ' agata ', pessoas)).toEqual(jasmine.objectContaining({ pessoaMovimentacaoId: 8, nomePessoaTransacao: 'Ágata' }));
      expect(aplicarPessoa(item(1, '2026-10-05', 10, { pessoaMovimentacaoId: 7 }), 'Mercado X', pessoas))
        .toEqual(jasmine.objectContaining({ pessoaMovimentacaoId: null, nomePessoaTransacao: 'Mercado X' }));
      expect(aplicarPessoa(item(1, '2026-10-05', 10, { pessoaMovimentacaoId: 7, nomePessoaTransacao: 'Giovanne' }), '  ', pessoas))
        .toEqual(jasmine.objectContaining({ pessoaMovimentacaoId: null, nomePessoaTransacao: null }));
    });

    it('trocar a pessoa pede à API para gravar a ligação (parte 2); "Eu" casa com a titular', () => {
      const pessoas = [{ id: 1, nomePessoa: 'EU', ehTitular: true }, { id: 7, nomePessoa: 'GIOVANNE' }];
      expect(aplicarPessoa(item(1, '2026-10-05', 10), 'giovanne', pessoas).alteraVinculoPessoa).toBeTrue();
      expect(aplicarPessoa(item(1, '2026-10-05', 10), 'Eu', pessoas))
        .toEqual(jasmine.objectContaining({ pessoaMovimentacaoId: 1, nomePessoaTransacao: 'EU', alteraVinculoPessoa: true }));
    });
  });

  describe('pessoa "Eu" (parte 2)', () => {
    it('mostra "Eu" para a titular e reconhece pelo vínculo ou pelo nome', () => {
      const daTitular = item(1, '2026-10-05', 10, { pessoaMovimentacaoId: 1, nomePessoaTransacao: 'EU' });
      const comObjeto = item(2, '2026-10-05', 10, { pessoaMovimentacao: { id: 1, nomePessoa: 'EU', ehTitular: true, categoriaId: null, tipoMovimentacaoId: null } });
      const outra = item(3, '2026-10-05', 10, { pessoaMovimentacaoId: 7, nomePessoaTransacao: 'EUGÊNIA' });
      expect(ehDoTitular(daTitular)).toBeTrue();
      expect(ehDoTitular(comObjeto)).toBeTrue();
      expect(ehDoTitular(outra)).toBeFalse();
      expect(nomeDaPessoa(daTitular)).toBe('Eu');
      expect(nomeDaPessoa(outra)).toBe('EUGÊNIA');
    });

    it('nas sugestões e na ordem, a titular vem primeiro como "Eu"', () => {
      expect(nomesParaSugestao([{ id: 7, nomePessoa: 'CARLOS' }, { id: 1, nomePessoa: 'EU', ehTitular: true }, { id: 8, nomePessoa: 'ÁGATA' }]))
        .toEqual(['Eu', 'ÁGATA', 'CARLOS']);
    });
  });
});

/** Card "Fatura dividida por pessoa" (card #45, parte 3, item 6). */
describe('faturaPorPessoa', () => {
  it('minhas compras × de outras pessoas (só quem entra nos acertos), por pessoa, sem as entradas', () => {
    const pessoas = [
      { id: 1, nomePessoa: 'EU', ehTitular: true }, { id: 7, nomePessoa: 'CARLOS', entraNosAcertos: true },
      { id: 8, nomePessoa: 'ÁGATHA', entraNosAcertos: true }, { id: 9, nomePessoa: 'MERCADO X', entraNosAcertos: false }
    ];
    const itens = [
      item(1, '2026-10-01', 100, { pessoaMovimentacaoId: 7 }), item(2, '2026-10-02', 50, { pessoaMovimentacaoId: 7 }),
      item(3, '2026-10-03', 30, { pessoaMovimentacaoId: 8 }), item(4, '2026-10-04', 200, { pessoaMovimentacaoId: 9 }),
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
