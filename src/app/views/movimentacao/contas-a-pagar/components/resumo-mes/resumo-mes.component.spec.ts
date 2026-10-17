import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ResumoMesComponent } from './resumo-mes.component';
import { ResumoMes } from '../../contas-a-pagar.regras';

/** Cards do topo de Contas a Pagar: receitas, despesas, já pago e vencidas do mês. */
describe('ResumoMesComponent', () => {
  let fixture: ComponentFixture<ResumoMesComponent>;
  const el = () => fixture.nativeElement as HTMLElement;
  const texto = () => (el().textContent ?? '').replace(/\s+/g, ' ');

  const vazio: ResumoMes = {
    receitas: 0, receitasQtd: 0, despesas: 0, despesasQtd: 0, pago: 0, percentualPago: 0,
    vencidasValor: 0, vencidasQtd: 0, naoRecebidasValor: 0, naoRecebidasQtd: 0
  };

  const mostrar = (resumo: Partial<ResumoMes>, compacto = false) => {
    fixture = TestBed.createComponent(ResumoMesComponent);
    fixture.componentRef.setInput('resumo', { ...vazio, ...resumo });
    fixture.componentRef.setInput('compacto', compacto);
    fixture.detectChanges();
  };

  describe('compacto (celular)', () => {
    const outubro: Partial<ResumoMes> = {
      receitas: 7313, receitasQtd: 3, despesas: 4577.74, despesasQtd: 19, pago: 1809.18, percentualPago: 39.52,
      vencidasValor: 2738.56, vencidasQtd: 11
    };

    it('carrossel com Despesas (e o pago), Vencidas e Receitas, nessa ordem, e um ponto por card', () => {
      mostrar(outubro, true);

      const cards = Array.from(el().querySelectorAll('.carrossel .resumo-slide'));
      expect(cards.length).toBe(3);
      const textos = cards.map(c => (c.textContent ?? '').replace(/\s+/g, ' '));
      expect(textos[0]).toContain('Despesas do mês');
      expect(textos[0]).toContain('R$ 1.809,18 pago · 40%');
      expect(textos[1]).toContain('Vencidas');
      expect(textos[1]).toContain('11 despesas em atraso');
      expect(textos[2]).toContain('Receitas do mês');
      expect(el().querySelectorAll('.carrossel-pontos span').length).toBe(3);
      expect(el().querySelector('p-card')).toBeNull();
    });

    it('vencidas no singular', () => {
      mostrar({ ...outubro, vencidasQtd: 1 }, true);
      expect(texto()).toContain('1 despesa em atraso');
    });
  });

  it('mostra os quatro valores em reais e o percentual pago', () => {
    mostrar({ receitas: 3000, despesas: 1750, pago: 1000, percentualPago: 1000 / 1750 * 100, vencidasValor: 500, vencidasQtd: 1 });

    expect(el().querySelectorAll('p-card').length).toBe(4);
    expect(texto()).toContain('R$ 3.000,00');
    expect(texto()).toContain('R$ 1.750,00');
    expect(texto()).toContain('R$ 1.000,00');
    expect(texto()).toContain('57% das despesas');
    expect(texto()).toContain('R$ 500,00');
    expect(texto()).toContain('1 conta');
  });

  it('receitas e despesas mostram quantos lançamentos, no singular e no plural', () => {
    mostrar({ receitas: 100, receitasQtd: 1, despesas: 300, despesasQtd: 3 });

    expect(texto()).toContain('1 lançamento');
    expect(texto()).toContain('3 lançamentos');
    expect(el().querySelectorAll('.resumo-icone').length).toBe(4);
  });

  it('plural das vencidas e card de vencidas destacado só quando há vencidas', () => {
    mostrar({ vencidasValor: 900, vencidasQtd: 3 });
    expect(texto()).toContain('3 contas');
    expect(el().querySelector('.resumo-vencidas.com-vencidas')).not.toBeNull();

    mostrar({});
    expect(el().querySelector('.resumo-vencidas.com-vencidas')).toBeNull();
  });

  it('receitas não recebidas aparecem à parte no card de vencidas, só quando há', () => {
    mostrar({ vencidasValor: 2738.56, vencidasQtd: 11, naoRecebidasValor: 5353, naoRecebidasQtd: 2 });
    expect(texto()).toContain('R$ 2.738,56');
    expect(texto()).toContain('+ R$ 5.353,00 em receitas não recebidas');

    mostrar({ vencidasValor: 100, vencidasQtd: 1 });
    expect(texto()).not.toContain('não recebidas');
  });
});
