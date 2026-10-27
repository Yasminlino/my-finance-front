import { ComponentFixture, TestBed } from '@angular/core/testing';
import { LancamentoDaConta } from 'src/app/core/models/conta.model';

import { ContaLancamentosComponent } from './conta-lancamentos.component';

/** Aba Lançamentos do painel da conta (card #22): só consulta. */
describe('ContaLancamentosComponent', () => {
  let fixture: ComponentFixture<ContaLancamentosComponent>;
  const el = () => fixture.nativeElement as HTMLElement;
  const texto = () => (el().textContent ?? '').replace(/\s+/g, ' ');
  const mostrar = (entradas: { lancamentos?: LancamentoDaConta[]; carregando?: boolean; erro?: boolean }) => {
    fixture = TestBed.createComponent(ContaLancamentosComponent);
    fixture.componentRef.setInput('lancamentos', entradas.lancamentos ?? []);
    fixture.componentRef.setInput('carregando', entradas.carregando ?? false);
    fixture.componentRef.setInput('erro', entradas.erro ?? false);
    fixture.componentRef.setInput('hoje', new Date(2026, 9, 26));
    fixture.detectChanges();
  };

  const lancamentos: LancamentoDaConta[] = [
    { id: 3, data: '2026-10-30', nome: 'Sofá', valor: 150, situacao: 'PENDENTE', ehParcelado: true, parcelaAtual: 3, quantidadeParcelas: 10 },
    { id: 2, data: '2026-10-05', nome: 'Sofá', valor: 150, situacao: 'PENDENTE', ehParcelado: true, parcelaAtual: 3, quantidadeParcelas: 10, observacao: 'atrasou' },
    { id: 1, data: '2026-09-05', nome: 'Sofá', valor: 150, situacao: 'PAGO NO PRAZO', ehParcelado: true, parcelaAtual: 2, quantidadeParcelas: 10 }
  ];

  beforeEach(() => TestBed.configureTestingModule({ imports: [ContaLancamentosComponent] }));

  it('resumo, grupos por mês e cada lançamento com dia, parcela, valor, situação e observação', () => {
    mostrar({ lancamentos });

    expect(texto()).toContain('1 pago no prazo');
    expect(texto()).toContain('2 pendentes');
    expect(texto()).toContain('R$ 150,00 pago');
    expect(Array.from(el().querySelectorAll('.lancamentos-mes')).map(m => m.textContent?.trim())).toEqual(['out/2026', 'set/2026']);

    const linhas = Array.from(el().querySelectorAll('.lancamento'));
    expect(linhas.length).toBe(3);
    expect(linhas[0].textContent).toContain('Dia 30');
    expect(linhas[0].textContent).toContain('3/10');
    expect(linhas[1].textContent).toContain('atrasou');
  });

  it('a tag segue Contas a Pagar: pendente já vencido aparece como ATRASADA', () => {
    mostrar({ lancamentos });

    const tags = Array.from(el().querySelectorAll('.lancamento p-tag')).map(t => t.textContent?.trim());
    expect(tags).toEqual(['PENDENTE', 'ATRASADA', 'PAGO NO PRAZO']);
  });

  it('vazio, carregando e erro', () => {
    mostrar({});
    expect(texto()).toContain('Esta conta ainda não gerou lançamentos');

    mostrar({ carregando: true });
    expect(el().querySelector('.lancamentos-carregando')).not.toBeNull();
    expect(texto()).not.toContain('ainda não gerou');

    mostrar({ erro: true });
    expect(texto()).toContain('Não foi possível carregar os lançamentos');
  });
});
