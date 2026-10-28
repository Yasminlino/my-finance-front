import { ContaDto } from 'src/app/core/models/conta.model';
import { CategoriaDto } from 'src/app/core/models/categoria.model';
import {
  LinhaLote, ajustarLinha, contarPorFiltro, filtrarLinhas, montarLinhas, payloadDaLinha, totaisDoLote
} from './lote.regras';

/** Regras do "Adicionar contas em lote" (card #48). */
describe('lote.regras', () => {
  const novembro = '2026-11';
  const hoje = new Date(2026, 10, 8); // 08/11/2026

  const categorias: CategoriaDto[] = [
    { id: 1, nome: 'Casa', subcategoria: 'Despesa', naturezaOperacao: 1, ativo: true, icone: 'pi pi-home', cor: 'laranja' },
    { id: 2, nome: 'Salário', subcategoria: 'Receita', naturezaOperacao: 2, ativo: true }
  ];

  const conta = (parcial: Partial<ContaDto> & { id: number; nome: string }): ContaDto => ({
    valor: 100,
    categoriaId: 1,
    categoriaNome: 'Casa',
    ativo: true,
    ehParcelado: false,
    parcelaAtual: 0,
    quantidadeParcelas: 0,
    vencimentos: [{ id: 1, contaId: parcial.id, dia: 10, diasVencimentoString: '10' }],
    ...parcial
  });

  const dias = (id: number, ...lista: number[]) =>
    lista.map(dia => ({ id: dia, contaId: id, dia, diasVencimentoString: '' + dia }));

  const linhas = (contas: ContaDto[], lancadas: number[] = []) =>
    montarLinhas(contas, lancadas.map(contaId => ({ contaId })), categorias, novembro, hoje);

  const porNome = (lista: LinhaLote[], nome: string) => lista.find(l => l.conta.nome === nome)!;

  describe('montarLinhas', () => {
    it('situação: disponível, já lançada, inativa e inválida (valor zerado ou sem dia)', () => {
      const lista = linhas([
        conta({ id: 1, nome: 'Aluguel' }),
        conta({ id: 2, nome: 'Luz', vencimentos: dias(2, 5, 20) }),
        conta({ id: 3, nome: 'Água', vencimentos: dias(3, 5, 20) }),
        conta({ id: 4, nome: 'Academia', ativo: false }),
        conta({ id: 5, nome: 'Gás', valor: 0 }),
        conta({ id: 6, nome: 'Feira', vencimentos: [] })
      ], [2, 2, 3]);

      expect(lista.map(l => [l.conta.nome, l.situacao])).toEqual([
        ['Academia', 'inativa'],
        ['Água', 'disponivel'], // só um dos dois vencimentos lançado
        ['Aluguel', 'disponivel'],
        ['Feira', 'invalida'],
        ['Gás', 'invalida'],
        ['Luz', 'lancada']
      ]);
      expect(porNome(lista, 'Gás').motivo).toBe('Informe o valor');
      expect(porNome(lista, 'Feira').motivo).toBe('Informe o dia');
    });

    it('ordem alfabética sem acento e sem diferenciar maiúscula', () => {
      const lista = linhas([conta({ id: 1, nome: 'escola' }), conta({ id: 2, nome: 'Énergia' }), conta({ id: 3, nome: 'Água' })]);

      expect(lista.map(l => l.conta.nome)).toEqual(['Água', 'Énergia', 'escola']);
    });

    it('tipo pela categoria, ícone e cor da categoria', () => {
      const lista = linhas([conta({ id: 1, nome: 'Aluguel' }), conta({ id: 2, nome: 'Salário', categoriaId: 2 })]);

      expect(porNome(lista, 'Aluguel').receita).toBeFalse();
      expect(porNome(lista, 'Aluguel').icone).toBe('pi pi-home');
      expect(porNome(lista, 'Aluguel').aparencia.cor).toBe('laranja');
      expect(porNome(lista, 'Salário').receita).toBeTrue();
    });

    it('vencimento no mês do lote: já venceu, vence hoje, vence em N dias', () => {
      const lista = linhas([
        conta({ id: 1, nome: 'A', vencimentos: dias(1, 5) }),
        conta({ id: 2, nome: 'B', vencimentos: dias(2, 8) }),
        conta({ id: 3, nome: 'C', vencimentos: dias(3, 12, 30) }),
        conta({ id: 4, nome: 'D', vencimentos: dias(4, 31) })
      ]);

      expect(porNome(lista, 'A').vencimento).toEqual({ dias: 'Dia 5', relativo: 'já venceu', tom: 'vermelho' });
      expect(porNome(lista, 'B').vencimento).toEqual({ dias: 'Dia 8', relativo: 'vence hoje', tom: 'laranja' });
      expect(porNome(lista, 'C').vencimento).toEqual({ dias: 'Dias 12 e 30', relativo: 'vence em 4 dias', tom: 'laranja' });
      // 31 em novembro cai no dia 30, como na API
      expect(porNome(lista, 'D').vencimento).toEqual({ dias: 'Dia 31', relativo: 'vence em 22 dias', tom: 'neutro' });
    });

    it('próxima parcela da conta parcelada; parcelas concluídas deixam a linha inválida', () => {
      const lista = linhas([
        conta({ id: 1, nome: 'Sofá', ehParcelado: true, parcelaAtual: 4, quantidadeParcelas: 10 }),
        conta({ id: 2, nome: 'TV', ehParcelado: true, parcelaAtual: 0, quantidadeParcelas: 3 }),
        conta({ id: 3, nome: 'Celular', ehParcelado: true, parcelaAtual: 13, quantidadeParcelas: 12 })
      ]);

      expect(porNome(lista, 'Sofá').parcela).toBe('Parcela 4 de 10');
      expect(porNome(lista, 'TV').parcela).toBe('Parcela 1 de 3');
      expect(porNome(lista, 'Celular').situacao).toBe('invalida');
      expect(porNome(lista, 'Celular').motivo).toBe('Parcelas concluídas');
    });
  });

  describe('ajustarLinha', () => {
    it('informar o dia de uma conta sem vencimento deixa a linha disponível', () => {
      const [feira] = linhas([conta({ id: 6, nome: 'Feira', vencimentos: [] })]);

      const ajustada = ajustarLinha(feira, { dias: [15] }, novembro, hoje);

      expect(ajustada.situacao).toBe('disponivel');
      expect(ajustada.dias).toEqual([15]);
      expect(ajustada.vencimento?.dias).toBe('Dia 15');
    });

    it('valor zerado deixa a linha inválida; um valor novo, disponível de novo', () => {
      const [aluguel] = linhas([conta({ id: 1, nome: 'Aluguel' })]);

      const zerada = ajustarLinha(aluguel, { valor: 0 }, novembro, hoje);
      expect(zerada.situacao).toBe('invalida');
      expect(ajustarLinha(zerada, { valor: 250 }, novembro, hoje).situacao).toBe('disponivel');
    });
  });

  describe('filtros', () => {
    const lista = () => linhas([
      conta({ id: 1, nome: 'Aluguel' }),
      conta({ id: 2, nome: 'Luz' }),
      conta({ id: 3, nome: 'Salário', categoriaId: 2, categoriaNome: 'Salário' }),
      conta({ id: 4, nome: 'Academia', ativo: false }),
      conta({ id: 5, nome: 'Feira', vencimentos: [] })
    ], [2]);

    it('Disponíveis traz as que ainda dá para lançar (inclusive as que pedem ajuste); Já lançadas, só elas', () => {
      const nomes = (filtro: 'disponiveis' | 'lancadas' | 'todas') =>
        filtrarLinhas(lista(), { filtro, busca: '', categorias: [] }).map(l => l.conta.nome);

      expect(nomes('disponiveis')).toEqual(['Aluguel', 'Feira', 'Salário']);
      expect(nomes('lancadas')).toEqual(['Luz']);
      expect(nomes('todas')).toEqual(['Academia', 'Aluguel', 'Feira', 'Luz', 'Salário']);
    });

    it('busca sem acento no nome e na categoria; filtro por categoria', () => {
      expect(filtrarLinhas(lista(), { filtro: 'todas', busca: 'salario', categorias: [] }).map(l => l.conta.nome))
        .toEqual(['Salário']);
      expect(filtrarLinhas(lista(), { filtro: 'todas', busca: 'casa', categorias: [] }).length).toBe(4);
      expect(filtrarLinhas(lista(), { filtro: 'todas', busca: '', categorias: [2] }).map(l => l.conta.nome))
        .toEqual(['Salário']);
    });

    it('contador de cada opção respeita a busca e as categorias', () => {
      expect(contarPorFiltro(lista(), { busca: '', categorias: [] })).toEqual({ disponiveis: 3, lancadas: 1, todas: 5 });
      expect(contarPorFiltro(lista(), { busca: 'luz', categorias: [] })).toEqual({ disponiveis: 0, lancadas: 1, todas: 1 });
    });
  });

  it('totais do rodapé: quantidade, receitas, despesas e saldo das selecionadas', () => {
    const lista = linhas([
      conta({ id: 1, nome: 'Aluguel', valor: 1200 }),
      conta({ id: 2, nome: 'Luz', valor: 180.5 }),
      conta({ id: 3, nome: 'Salário', valor: 5000, categoriaId: 2 })
    ]);

    expect(totaisDoLote(lista)).toEqual({ quantidade: 3, receitas: 5000, despesas: 1380.5, saldo: 3619.5 });
  });

  describe('payloadDaLinha', () => {
    it('sem ajuste: valor da conta, sem valorDoMes nem dias; fixa chega AGUARDANDO, variável PENDENTE', () => {
      const lista = linhas([
        conta({ id: 1, nome: 'Internet', valor: 120, valorFixo: true }),
        conta({ id: 2, nome: 'Luz', valor: 300 })
      ]);

      const internet = payloadDaLinha(porNome(lista, 'Internet'), novembro);
      expect(internet).toEqual(jasmine.objectContaining({ contaId: 1, nome: 'Internet', valor: 120, situacao: 'AGUARDANDO' }));
      expect(internet.valorDoMes).toBeUndefined();
      expect(internet.diasVencimento).toBeUndefined();
      expect(payloadDaLinha(porNome(lista, 'Luz'), novembro).situacao).toBe('PENDENTE');
    });

    it('com valor e dia ajustados, manda valorDoMes e diasVencimento só deste lançamento', () => {
      const [feira] = linhas([conta({ id: 6, nome: 'Feira', vencimentos: [] })]);
      const ajustada = ajustarLinha(feira, { dias: [15], valor: 87.3 }, novembro, hoje);

      const payload = payloadDaLinha(ajustada, novembro);

      expect(payload.valorDoMes).toBe(87.3);
      expect(payload.diasVencimento).toEqual([15]);
      expect(payload.data).toEqual(new Date(2026, 10, 1));
    });
  });
});
