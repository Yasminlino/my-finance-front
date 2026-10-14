import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TotaisSelecaoComponent } from './totais-selecao.component';

/**
 * Totais da seleção (receita, despesa, saldo), compartilhado por Contas a Pagar, Extrato e Orçamento.
 * Saiu de contas-a-pagar para shared (FE-P2-03): Listas e Extrato importavam o módulo inteiro
 * de Contas a Pagar só para usá-lo.
 */
describe('TotaisSelecaoComponent', () => {
  let fixture: ComponentFixture<TotaisSelecaoComponent>;
  const texto = () => ((fixture.nativeElement as HTMLElement).textContent ?? '').replace(/\s+/g, ' ');

  const mostrar = (valores: Record<string, number>) => {
    fixture = TestBed.createComponent(TotaisSelecaoComponent);
    Object.entries(valores).forEach(([nome, valor]) => fixture.componentRef.setInput(nome, valor));
    fixture.detectChanges();
  };

  it('mostra receita, despesa e saldo em reais e a contagem', () => {
    mostrar({ receita: 150, despesa: 1234.5, saldo: -1084.5, count: 2 });

    expect(texto()).toContain('R$ 150,00');
    expect(texto()).toContain('R$ 1.234,50');
    expect(texto()).toContain('-R$ 1.084,50');
    expect(texto()).toContain('2 itens selecionado(s)');
  });

  it('saldo negativo em vermelho, positivo em verde; singular para um item', () => {
    mostrar({ saldo: -1, count: 1 });
    const saldo = (fixture.nativeElement as HTMLElement).querySelectorAll('.fs-4')[2];
    expect(saldo.classList).toContain('text-danger');
    expect(texto()).toContain('1 item selecionado(s)');

    mostrar({ saldo: 5 });
    expect((fixture.nativeElement as HTMLElement).querySelectorAll('.fs-4')[2].classList).toContain('text-success');
  });
});
