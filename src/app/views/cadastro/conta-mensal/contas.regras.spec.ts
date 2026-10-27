import { ContaDto, LancamentoDaConta } from 'src/app/core/models/conta.model';
import {
  FiltroContas, contarPorSituacao, diasDaConta, duplicarConta, filtrarContas, lancamentosNoPeriodo, lancamentosPorMes, periodoPadrao, previaParcelamento,
  pontosDoAcompanhamento, resumoDasContas, resumoDosLancamentos, textoVencimento
} from './contas.regras';

const conta = (id: number, nome: string, valor: number, dias: number[], extra: Partial<ContaDto> = {}): ContaDto => ({
  id, nome, valor, categoriaId: 1, categoriaNome: 'Casa', ativo: true, ehParcelado: false, parcelaAtual: 0,
  quantidadeParcelas: 0, vencimentos: dias.map((dia, i) => ({ id: i, contaId: id, dia, diasVencimentoString: '' })),
  ...extra
});

/** Regras do Cadastro de Contas (card #22). */
describe('contas.regras', () => {
  describe('vencimento', () => {
    it('texto conforme a quantidade de dias, em ordem', () => {
      expect(textoVencimento([11])).toBe('Todo dia 11');
      expect(textoVencimento([20, 5])).toBe('Dias 5 e 20');
      expect(textoVencimento([25, 5, 15])).toBe('Dias 5, 15 e 25');
      expect(textoVencimento([])).toBe('Sem vencimento');
    });

    it('dias da conta em ordem; sem vencimentos, lista vazia', () => {
      expect(diasDaConta(conta(1, 'Luz', 100, [20, 5]))).toEqual([5, 20]);
      expect(diasDaConta({ ...conta(1, 'Luz', 100, []), vencimentos: undefined })).toEqual([]);
    });
  });

  describe('filtrarContas e contarPorSituacao', () => {
    const contas = [
      conta(1, 'Internet', 120, [10], { categoriaId: 2, categoriaNome: 'Contas Fixas' }),
      conta(2, 'Água', 80, [5]),
      conta(3, 'Academia', 99.9, [20], { ativo: false }),
      conta(4, 'Celular', 50, [5, 20], { categoriaId: 2, categoriaNome: 'Contas Fixas' })
    ];
    const filtro: FiltroContas = { situacao: 'ativas', busca: '', categorias: [], ordem: 'vencimento' };
    const ids = (lista: ContaDto[]) => lista.map(c => c.id);

    it('por padrão só as ativas, pelo primeiro dia de vencimento e depois o nome', () => {
      expect(ids(filtrarContas(contas, filtro))).toEqual([2, 4, 1]);
    });

    it('situação inativas e todas', () => {
      expect(ids(filtrarContas(contas, { ...filtro, situacao: 'inativas' }))).toEqual([3]);
      expect(ids(filtrarContas(contas, { ...filtro, situacao: 'todas' }))).toEqual([2, 4, 1, 3]);
    });

    it('filtra por categoria e pela busca sem acento (nome ou categoria)', () => {
      expect(ids(filtrarContas(contas, { ...filtro, categorias: [2] }))).toEqual([4, 1]);
      expect(ids(filtrarContas(contas, { ...filtro, busca: 'AGUA' }))).toEqual([2]);
      expect(ids(filtrarContas(contas, { ...filtro, busca: 'fixas' }))).toEqual([4, 1]);
    });

    it('ordena por nome, maior valor e categoria', () => {
      expect(ids(filtrarContas(contas, { ...filtro, ordem: 'nome' }))).toEqual([2, 4, 1]);
      expect(ids(filtrarContas(contas, { ...filtro, ordem: 'valor' }))).toEqual([1, 2, 4]);
      expect(ids(filtrarContas(contas, { ...filtro, ordem: 'categoria' }))).toEqual([2, 4, 1]);
    });

    it('contador por situação segue a busca e a categoria', () => {
      expect(contarPorSituacao(contas, filtro)).toEqual({ ativas: 3, inativas: 1, todas: 4 });
      expect(contarPorSituacao(contas, { ...filtro, busca: 'acad' })).toEqual({ ativas: 0, inativas: 1, todas: 1 });
      expect(contarPorSituacao(contas, { ...filtro, categorias: [2] })).toEqual({ ativas: 2, inativas: 0, todas: 2 });
    });
  });

  it('resumo: ativas, saldo previsto (receitas − despesas das ativas), parceladas em andamento e inativas', () => {
    const resumo = resumoDasContas([
      conta(1, 'Internet', 120, [10]),
      conta(2, 'Sofá', 300, [5], { ehParcelado: true, parcelaAtual: 3, quantidadeParcelas: 10 }),
      conta(3, 'TV', 200, [5], { ehParcelado: true, parcelaAtual: 3, quantidadeParcelas: 10, ativo: false }),
      conta(4, 'Academia', 99.9, [20], { ativo: false }),
      conta(5, 'Salário', 1000, [5], { categoriaId: 9 }),
      conta(6, 'Bônus', 500, [5], { categoriaId: 9, ativo: false })
    ], id => id === 9);

    expect(resumo).toEqual({
      ativas: 3, receitasMes: 1000, despesasMes: 420, saldoMes: 580, parceladasEmAndamento: 1, inativas: 3
    });
  });

  describe('previaParcelamento', () => {
    const outubro = new Date(2026, 9, 26);

    it('faltam da parcela atual até o total; valor por mês dividido pelos dias; término estimado', () => {
      expect(previaParcelamento({ valor: 300, dias: [5, 20], parcelaAtual: 3, total: 10 }, outubro)).toEqual({
        faltam: 8, de: 3, ate: 10, valorMes: 300, lancamentosPorMes: 2, valorLancamento: 150, totalRestante: 2400,
        termino: 'mai/2027'
      });
    });

    it('parcela atual 0 (nenhuma paga) conta como a primeira', () => {
      expect(previaParcelamento({ valor: 100, dias: [10], parcelaAtual: 0, total: 3 }, outubro)?.faltam).toBe(3);
    });

    it('sem dias ou com parcelas fora do limite, não há prévia', () => {
      expect(previaParcelamento({ valor: 100, dias: [], parcelaAtual: 1, total: 3 }, outubro)).toBeNull();
      expect(previaParcelamento({ valor: 100, dias: [5], parcelaAtual: 4, total: 3 }, outubro)).toBeNull();
      expect(previaParcelamento({ valor: 100, dias: [5], parcelaAtual: 1, total: 0 }, outubro)).toBeNull();
    });
  });

  describe('lançamentos da conta (aba Lançamentos)', () => {
    const l = (id: number, data: string, situacao: string, valor = 150): LancamentoDaConta =>
      ({ id, data, nome: 'Sofá', valor, situacao, ehParcelado: false });

    it('resumo por situação e total pago (no prazo e atrasado)', () => {
      expect(resumoDosLancamentos([
        l(1, '2026-10-05', 'PENDENTE'), l(2, '2026-09-05', 'PAGO NO PRAZO'), l(3, '2026-08-05', 'PAGO ATRASADO', 100),
        l(4, '2026-11-05', 'AGUARDANDO'), l(5, '2026-07-05', 'PAGO NO PRAZO')
      ])).toEqual({ pagosNoPrazo: 2, pagosAtrasados: 1, pendentes: 1, aguardando: 1, totalPago: 400 });
    });

    /** Período padrão de `hoje` e o acompanhamento dele, como o painel abre. */
    const comPeriodoPadrao = (lista: LancamentoDaConta[], hoje: Date) => pontosDoAcompanhamento(lista, periodoPadrao(lista, hoje));

    it('período padrão: 12 meses até o mês mais recente com lançamento ou o atual', () => {
      expect(periodoPadrao([l(1, '2026-11-05', 'PENDENTE')], new Date(2026, 9, 27)))
        .toEqual({ de: { ano: 2025, mes: 12 }, ate: { ano: 2026, mes: 11 } });
      expect(periodoPadrao([], new Date(2026, 0, 10)))
        .toEqual({ de: { ano: 2025, mes: 2 }, ate: { ano: 2026, mes: 1 } });
    });

    it('lançamentos no período: de e até inclusos, pelo mês', () => {
      const lista = [l(1, '2026-03-31', 'PENDENTE'), l(2, '2026-04-01', 'PENDENTE'), l(3, '2026-06-30', 'PENDENTE'), l(4, '2026-07-01', 'PENDENTE')];
      expect(lancamentosNoPeriodo(lista, { de: { ano: 2026, mes: 4 }, ate: { ano: 2026, mes: 6 } }).map(x => x.id)).toEqual([2, 3]);
    });

    it('o acompanhamento segue o período escolhido, mesmo com mais de 12 meses', () => {
      const p = pontosDoAcompanhamento([l(1, '2025-01-05', 'PAGO NO PRAZO', 50)], { de: { ano: 2025, mes: 1 }, ate: { ano: 2026, mes: 6 } });
      expect(p.meses.length).toBe(18);
      expect(p.meses[0]).toBe('jan/25');
      expect(p.valores[0]).toBe(50);
    });

    it('acompanhamento: 12 meses até o mais recente (ou o atual), valor do mês somado e mês sem lançamento vazio', () => {
      const p = comPeriodoPadrao([
        l(1, '2026-11-05', 'PENDENTE', 250), l(2, '2026-10-05', 'AGUARDANDO', 190), l(3, '2026-10-20', 'PAGO NO PRAZO', 10),
        l(4, '2026-09-05', 'PAGO ATRASADO', 190), l(5, '2025-12-03', 'PAGO NO PRAZO', 250), l(6, '2025-11-03', 'PAGO NO PRAZO', 999)
      ], new Date(2026, 9, 27));

      expect(p.meses.length).toBe(12);
      expect(p.meses[0]).toBe('dez/25');
      expect(p.meses[11]).toBe('nov/26');
      expect(p.valores[0]).toBe(250);
      expect(p.valores[1]).toBeNull();
      expect(p.valores[10]).toBe(200);
      // nov/2025 fica fora da janela de 12 meses.
      expect(p.valores.filter(v => v !== null).length).toBe(4);
    });

    it('situação do ponto: em aberto vence com atraso, que vence no prazo', () => {
      const p = comPeriodoPadrao([
        l(1, '2026-10-05', 'AGUARDANDO'), l(2, '2026-10-20', 'PAGO NO PRAZO'),
        l(3, '2026-09-05', 'PAGO ATRASADO'), l(4, '2026-09-20', 'PAGO NO PRAZO'),
        l(5, '2026-08-05', 'PAGO NO PRAZO')
      ], new Date(2026, 9, 27));

      expect(p.situacoes.slice(-3)).toEqual(['no-prazo', 'atraso', 'aberto']);
      expect(p.situacoes[0]).toBeNull();
    });

    it('avisa mês com mais de 10× a mediana dos outros (valor fora do padrão)', () => {
      const p = comPeriodoPadrao([
        l(1, '2026-10-05', 'PAGO NO PRAZO', 250), l(2, '2026-09-05', 'PAGO NO PRAZO', 240), l(3, '2026-08-05', 'PAGO NO PRAZO', 260),
        l(4, '2026-01-05', 'PAGO NO PRAZO', 25000)
      ], new Date(2026, 9, 27));

      expect(p.foraDoPadrao).toEqual([{ mes: 'jan/26', valor: 25000 }]);
    });

    it('sem lançamentos futuros, a janela termina no mês atual', () => {
      const p = comPeriodoPadrao([l(1, '2026-03-05', 'PAGO NO PRAZO')], new Date(2026, 9, 27));
      expect(p.meses[11]).toBe('out/26');
      expect(p.foraDoPadrao).toEqual([]);
    });

    it('agrupa por mês na ordem que veio (mais recente primeiro), com o rótulo "out/2026"', () => {
      const grupos = lancamentosPorMes([l(1, '2026-10-20', 'PENDENTE'), l(2, '2026-10-05', 'PENDENTE'), l(3, '2026-09-05', 'PAGO NO PRAZO')]);

      expect(grupos.map(g => g.mes)).toEqual(['out/2026', 'set/2026']);
      expect(grupos[0].itens.map(i => i.id)).toEqual([1, 2]);
    });
  });

  it('duplicar copia a conta como nova: "(cópia)" no nome e parcela atual 1', () => {
    const copia = duplicarConta(conta(2, 'Sofá', 300, [5], { ehParcelado: true, parcelaAtual: 7, quantidadeParcelas: 10, observacao: 'loja X' }));

    expect(copia.id).toBe(0);
    expect(copia.nome).toBe('Sofá (cópia)');
    expect(copia.parcelaAtual).toBe(1);
    expect(copia.quantidadeParcelas).toBe(10);
    expect(copia.observacao).toBe('loja X');
    expect(diasDaConta(copia)).toEqual([5]);
  });
});
