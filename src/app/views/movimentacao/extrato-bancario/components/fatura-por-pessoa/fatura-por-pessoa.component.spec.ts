import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FaturaPorPessoaComponent } from './fatura-por-pessoa.component';

/** Card "Fatura dividida por pessoa" na aba Lançamentos (card #45, parte 3, item 6). */
describe('FaturaPorPessoaComponent', () => {
  let fixture: ComponentFixture<FaturaPorPessoaComponent>;
  const el = () => fixture.nativeElement as HTMLElement;
  const texto = () => (el().textContent ?? '').replace(/\s+/g, ' ');

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [FaturaPorPessoaComponent] });
    fixture = TestBed.createComponent(FaturaPorPessoaComponent);
    fixture.componentRef.setInput('fatura', {
      total: 400, minhas: 220, outras: 180,
      porPessoa: [{ pessoaId: 7, nome: 'CARLOS', valor: 150 }, { pessoaId: 8, nome: 'ÁGATHA', valor: 30 }]
    });
    fixture.componentRef.setInput('devolvido', 50);
    fixture.componentRef.setInput('falta', 130);
    fixture.detectChanges();
  });

  it('mostra minhas × de outras pessoas numa barra empilhada, com o já devolvido e o que falta', () => {
    const partes = Array.from(el().querySelectorAll('.fatura-barra__parte')) as HTMLElement[];
    expect(partes.map(p => p.style.width)).toEqual(['55%', '37.5%', '7.5%']);
    expect(texto()).toContain('Minhas compras');
    expect(texto()).toContain('CARLOS');
    expect(texto()).toContain('Já devolvido');
    expect(texto()).toContain('R$ 130,00');
  });

  it('"Ver acertos" avisa a tela', () => {
    const ver = jasmine.createSpy('ver');
    fixture.componentInstance.verAcertos.subscribe(ver);
    (el().querySelector('button') as HTMLButtonElement).click();
    expect(ver).toHaveBeenCalled();
  });
});
