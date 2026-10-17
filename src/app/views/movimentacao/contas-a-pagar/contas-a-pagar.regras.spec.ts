import { LinhaContasMensais } from 'src/app/core/models/conta-mensal.model';
import { TagStatus } from 'src/app/shared/enums/status.enum';
import {
  contarPorSituacao,
  corDaCategoria,
  iconeDaCategoria,
  previaDoEfeito,
  resumoDoMes,
  situacao,
  statusAoPagar,
  tagDoStatus,
  vencimentoDe,
  vencimentoRelativo
} from './contas-a-pagar.regras';

/** Regras de exibição de Contas a Pagar: situação, vencimento relativo, resumo do mês. */
describe('contas-a-pagar.regras', () => {
  // 17/10/2026 às 15h: a hora não pode influenciar a comparação de dias.
  const hoje = new Date(2026, 9, 17, 15, 0);

  const conta = (parcial: Partial<LinhaContasMensais>): LinhaContasMensais => ({
    id: 1, idAccount: 1, name: 'Luz', value: 100, date: '2026-10-17' as any, ehParcelado: false,
    categoryId: 1, categoryName: 'Moradia', tipoContaId: '', subCategoryName: 'Despesa',
    status: 'PENDENTE', statusSalvo: 'PENDENTE', desbloqueiaCampos: false,
    ...parcial
  });

  describe('vencimentoDe', () => {
    it('lê "YYYY-MM-DD" como meia-noite local daquele dia', () => {
      expect(vencimentoDe({ date: '2026-10-05' })).toEqual(new Date(2026, 9, 5));
    });

    it('zera a hora de um Date', () => {
      expect(vencimentoDe({ date: new Date(2026, 9, 5, 22, 30) })).toEqual(new Date(2026, 9, 5));
    });
  });

  describe('situacao', () => {
    it('vence hoje e está em aberto: a vencer', () => {
      expect(situacao(conta({ date: '2026-10-17' as any }), hoje)).toBe('a-vencer');
    });

    it('venceu ontem em aberto: atrasada (PENDENTE ou AGUARDANDO)', () => {
      expect(situacao(conta({ date: '2026-10-16' as any }), hoje)).toBe('atrasada');
      expect(situacao(conta({ date: '2026-10-16' as any, status: 'AGUARDANDO' }), hoje)).toBe('atrasada');
    });

    it('paga, no prazo ou atrasada, é paga mesmo vencida', () => {
      expect(situacao(conta({ date: '2026-10-01' as any, status: 'PAGO NO PRAZO' }), hoje)).toBe('paga');
      expect(situacao(conta({ date: '2026-10-01' as any, status: 'PAGO ATRASADO' }), hoje)).toBe('paga');
    });
  });

  describe('vencimentoRelativo', () => {
    it('vencida: "Vencida há N dias" em vermelho, singular para 1', () => {
      expect(vencimentoRelativo(conta({ date: '2026-10-05' as any }), hoje)).toEqual({ texto: 'Vencida há 12 dias', tom: 'vermelho' });
      expect(vencimentoRelativo(conta({ date: '2026-10-16' as any }), hoje)).toEqual({ texto: 'Vencida há 1 dia', tom: 'vermelho' });
    });

    it('hoje e até 7 dias: laranja', () => {
      expect(vencimentoRelativo(conta({ date: '2026-10-17' as any }), hoje)).toEqual({ texto: 'Vence hoje', tom: 'laranja' });
      expect(vencimentoRelativo(conta({ date: '2026-10-18' as any }), hoje)).toEqual({ texto: 'Vence em 1 dia', tom: 'laranja' });
      expect(vencimentoRelativo(conta({ date: '2026-10-24' as any }), hoje)).toEqual({ texto: 'Vence em 7 dias', tom: 'laranja' });
    });

    it('mais de 7 dias: sem texto relativo', () => {
      expect(vencimentoRelativo(conta({ date: '2026-10-25' as any }), hoje)).toEqual({ texto: '', tom: 'neutro' });
    });

    it('paga: "Paga" em cinza (a API não guarda a data do pagamento)', () => {
      expect(vencimentoRelativo(conta({ date: '2026-10-05' as any, status: 'PAGO ATRASADO' }), hoje)).toEqual({ texto: 'Paga', tom: 'cinza' });
    });

    it('receita fala em recebimento: "Não recebido há N dias" e "Recebida"', () => {
      const salario = { subCategoryName: 'Receita', date: '2026-10-05' as any };
      expect(vencimentoRelativo(conta(salario), hoje)).toEqual({ texto: 'Não recebido há 12 dias', tom: 'vermelho' });
      expect(vencimentoRelativo(conta({ ...salario, status: 'PAGO NO PRAZO' }), hoje)).toEqual({ texto: 'Recebida', tom: 'cinza' });
    });
  });

  describe('statusAoPagar', () => {
    it('no dia do vencimento ou antes: no prazo', () => {
      expect(statusAoPagar(new Date(2026, 9, 17), hoje)).toBe('PAGO NO PRAZO');
      expect(statusAoPagar(new Date(2026, 9, 30), hoje)).toBe('PAGO NO PRAZO');
    });

    it('depois do vencimento: atrasado', () => {
      expect(statusAoPagar(new Date(2026, 9, 16), hoje)).toBe('PAGO ATRASADO');
    });
  });

  describe('tagDoStatus', () => {
    it('em aberto e vencida vira ATRASADA (danger), só na exibição', () => {
      expect(tagDoStatus(conta({ date: '2026-10-10' as any }), hoje)).toEqual({ label: 'ATRASADA', severity: TagStatus.Danger });
    });

    it('receita em aberto e vencida vira NÃO RECEBIDO', () => {
      expect(tagDoStatus(conta({ date: '2026-10-10' as any, subCategoryName: 'Receita' }), hoje))
        .toEqual({ label: 'NÃO RECEBIDO', severity: TagStatus.Danger });
    });

    it('os demais usam o rótulo e a cor do status salvo', () => {
      expect(tagDoStatus(conta({ status: 'AGUARDANDO' }), hoje)).toEqual({ label: 'AGUARDANDO', severity: TagStatus.Info });
      expect(tagDoStatus(conta({ date: '2026-10-01' as any, status: 'PAGO ATRASADO' }), hoje)).toEqual({ label: 'PAGO ATRASADO', severity: TagStatus.Warning });
    });
  });

  describe('resumoDoMes', () => {
    it('separa receitas e despesas, soma o pago e as vencidas', () => {
      const resumo = resumoDoMes([
        conta({ id: 1, value: 3000, subCategoryName: 'Receita', status: 'PAGO NO PRAZO' }),
        conta({ id: 2, value: 'R$ 1.000,00', status: 'PAGO NO PRAZO' }),
        conta({ id: 3, value: 500, date: '2026-10-10' as any }),
        conta({ id: 4, value: 250, date: '2026-10-25' as any })
      ], hoje);

      expect(resumo).toEqual({
        receitas: 3000,
        receitasQtd: 1,
        despesas: 1750,
        despesasQtd: 3,
        pago: 1000,
        percentualPago: 1000 / 1750 * 100,
        vencidasValor: 500,
        vencidasQtd: 1,
        naoRecebidasValor: 0,
        naoRecebidasQtd: 0
      });
    });

    it('vencidas são só as que não são receita; receita atrasada conta à parte', () => {
      const resumo = resumoDoMes([
        conta({ id: 1, value: 4000, subCategoryName: 'Receita', date: '2026-10-05' as any }),
        conta({ id: 2, value: 300, date: '2026-10-05' as any }),
        conta({ id: 3, value: 80, subCategoryName: 'Carlos', date: '2026-10-05' as any })
      ], hoje);

      expect([resumo.vencidasValor, resumo.vencidasQtd]).toEqual([380, 2]);
      expect([resumo.naoRecebidasValor, resumo.naoRecebidasQtd]).toEqual([4000, 1]);
    });

    it('sem despesas o percentual pago é zero', () => {
      expect(resumoDoMes([], hoje).percentualPago).toBe(0);
    });
  });

  it('contarPorSituacao conta o mês inteiro', () => {
    expect(contarPorSituacao([
      conta({ id: 1, status: 'PAGO NO PRAZO' }),
      conta({ id: 2, date: '2026-10-10' as any }),
      conta({ id: 3, date: '2026-10-20' as any }),
      conta({ id: 4, date: '2026-10-21' as any })
    ], hoje)).toEqual({ todas: 4, 'a-vencer': 2, vencidas: 1, pagas: 1 });
  });

  describe('previaDoEfeito', () => {
    it('avisa quando a alteração muda a situação da conta', () => {
      const atrasada = conta({ date: '2026-10-10' as any });
      expect(previaDoEfeito(atrasada, { ...atrasada, date: '2026-10-30' as any }, hoje)).toBe('Deixa de ficar atrasada');
      expect(previaDoEfeito(conta({}), conta({ date: '2026-10-01' as any }), hoje)).toBe('Passa a ficar atrasada');
      expect(previaDoEfeito(atrasada, { ...atrasada, status: 'PAGO ATRASADO' }, hoje)).toBe('Passa a contar como paga');
      expect(previaDoEfeito(conta({ status: 'PAGO NO PRAZO' }), conta({}), hoje)).toBe('Volta a ficar em aberto');
    });

    it('sem mudança de situação não há prévia', () => {
      expect(previaDoEfeito(conta({}), conta({ value: 300 }), hoje)).toBe('');
    });
  });

  describe('iconeDaCategoria', () => {
    it('acha o ícone por palavra-chave, sem diferenciar acento e caixa', () => {
      expect(iconeDaCategoria('Moradia')).toBe('pi pi-home');
      expect(iconeDaCategoria('EDUCAÇÃO')).toBe('pi pi-graduation-cap');
      expect(iconeDaCategoria('Cartão de crédito')).toBe('pi pi-credit-card');
    });

    it('categoria desconhecida ou vazia usa a carteira', () => {
      expect(iconeDaCategoria('Outros')).toBe('pi pi-wallet');
      expect(iconeDaCategoria(undefined)).toBe('pi pi-wallet');
    });

    it('cobre as categorias que caíam na carteira', () => {
      expect(iconeDaCategoria('Investimento')).toBe('pi pi-chart-line');
      expect(iconeDaCategoria('Logística')).toBe('pi pi-truck');
      expect(iconeDaCategoria('Débito automático')).toBe('pi pi-sync');
      expect(iconeDaCategoria('Imposto/Juros')).toBe('pi pi-receipt');
    });
  });

  describe('corDaCategoria', () => {
    it('é estável para o mesmo nome (sem diferenciar acento e caixa) e fica entre as 8 cores', () => {
      expect(corDaCategoria('Saúde')).toBe(corDaCategoria('SAUDE'));
      expect(corDaCategoria('Moradia')).toMatch(/^cor-[0-7]$/);
    });

    it('categorias diferentes tendem a cores diferentes', () => {
      const cores = new Set(['Moradia', 'Saúde', 'Salário', 'Transporte', 'Investimento', 'Cartão de crédito']
        .map(corDaCategoria));
      expect(cores.size).toBeGreaterThan(3);
    });

    it('sem categoria usa a cor neutra', () => {
      expect(corDaCategoria(undefined)).toBe('cor-neutra');
    });
  });
});
