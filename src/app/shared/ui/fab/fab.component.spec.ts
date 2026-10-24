import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FabComponent } from './fab.component';

/** Botão flutuante do celular (card #27), tirado do "+" de Contas a Pagar. */
describe('FabComponent', () => {
  let fixture: ComponentFixture<FabComponent>;
  const botao = () => (fixture.nativeElement as HTMLElement).querySelector('button')!;

  beforeEach(() => {
    fixture = TestBed.createComponent(FabComponent);
    fixture.componentRef.setInput('rotulo', 'Nova conta');
    fixture.detectChanges();
  });

  it('tem o rótulo para leitores de tela e o ícone padrão +', () => {
    expect(botao().getAttribute('aria-label')).toBe('Nova conta');
    expect(botao().querySelector('.pi-plus')).not.toBeNull();
  });

  it('o toque emite clique', () => {
    const clique = jasmine.createSpy('clique');
    fixture.componentInstance.clique.subscribe(clique);

    botao().click();

    expect(clique).toHaveBeenCalledTimes(1);
  });
});
