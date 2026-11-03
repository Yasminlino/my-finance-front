import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AgendaMiniMesComponent } from './agenda-mini-mes.component';

/** Mini calendário da agenda (card #69, parte 2). Novembro de 2026 começa num domingo. */
describe('AgendaMiniMesComponent', () => {
  let fixture: ComponentFixture<AgendaMiniMesComponent>;
  const el = () => fixture.nativeElement as HTMLElement;

  function abrir(ajuste: Partial<{ marcados: Set<string>; realcados: string[] }> = {}) {
    fixture = TestBed.createComponent(AgendaMiniMesComponent);
    fixture.componentRef.setInput('mes', new Date(2026, 10, 18));
    fixture.componentRef.setInput('hoje', '2026-11-03');
    fixture.componentRef.setInput('marcados', ajuste.marcados ?? new Set(['2026-11-04', '2026-11-20']));
    fixture.componentRef.setInput('realcados', ajuste.realcados ?? ['2026-11-02', '2026-11-03']);
    fixture.detectChanges();
  }

  beforeEach(() => TestBed.configureTestingModule({ imports: [AgendaMiniMesComponent] }));

  it('título, letras da semana e a grade da segunda ao domingo', () => {
    abrir();
    expect(el().querySelector('.mini-mes__titulo')!.textContent).toContain('Novembro de 2026');
    expect(Array.from(el().querySelectorAll('.mini-mes__semana')).map(e => e.textContent)).toEqual(['S', 'T', 'Q', 'Q', 'S', 'S', 'D']);
    const dias = el().querySelectorAll('.mini-mes__dia');
    expect(dias.length).toBe(42);
    expect(dias[0].textContent).toContain('26');
    expect(dias[0].classList).toContain('mini-mes__dia--fora');
  });

  it('ponto nos dias com item, hoje e o período realçado', () => {
    abrir();
    const dia = (n: string) => el().querySelector(`[aria-label^="${n}"]`)!;
    expect(dia('4/11').querySelector('.mini-mes__ponto--tem')).not.toBeNull();
    expect(dia('5/11').querySelector('.mini-mes__ponto--tem')).toBeNull();
    expect(dia('3/11').classList).toContain('mini-mes__dia--hoje');
    expect(dia('3/11').getAttribute('aria-label')).toBe('3/11, hoje');
    expect(dia('2/11').classList).toContain('mini-mes__dia--realce');
    expect(dia('4/11').getAttribute('aria-label')).toBe('4/11, tem itens');
  });

  it('escolher um dia e trocar o mês avisam quem usa', () => {
    abrir();
    const escolhidos: string[] = [];
    const trocas: number[] = [];
    fixture.componentInstance.escolher.subscribe(d => escolhidos.push(d));
    fixture.componentInstance.trocarMes.subscribe(t => trocas.push(t));
    (el().querySelector('[aria-label^="20/11"]') as HTMLButtonElement).click();
    (el().querySelector('[aria-label="Mês anterior"] button, button[aria-label="Mês anterior"]') as HTMLButtonElement).click();
    (el().querySelector('[aria-label="Próximo mês"] button, button[aria-label="Próximo mês"]') as HTMLButtonElement).click();
    expect(escolhidos).toEqual(['2026-11-20']);
    expect(trocas).toEqual([-1, 1]);
  });
});
