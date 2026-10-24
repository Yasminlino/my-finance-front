import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { StatCardComponent } from './stat-card.component';

@Component({
  standalone: true,
  imports: [StatCardComponent],
  template: `
    <mf-stat-card rotulo="Vencidas" valor="R$ 1.668,99" icone="pi pi-exclamation-triangle" tom="perigo"
      corDoValor="perigo" [destaque]="destaque">
      <small id="detalhe">11 contas</small>
    </mf-stat-card>`
})
class HostComponent {
  destaque = true;
}

/** Card de resumo (card #27), tirado dos cards do topo de Contas a Pagar. */
describe('StatCardComponent', () => {
  let fixture: ComponentFixture<HostComponent>;
  const el = () => fixture.nativeElement as HTMLElement;

  beforeEach(() => {
    fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
  });

  it('mostra rótulo, valor, ícone no tom pedido e o conteúdo abaixo do valor', () => {
    expect(el().querySelector('.mf-stat-card__rotulo')?.textContent?.trim()).toBe('Vencidas');
    expect(el().querySelector('.mf-stat-card__valor')?.textContent?.trim()).toBe('R$ 1.668,99');
    expect(el().querySelector('.mf-stat-card__icone')?.classList).toContain('mf-stat-card__icone--perigo');
    expect(el().querySelector('.mf-stat-card__icone i')?.className).toBe('pi pi-exclamation-triangle');
    expect(el().querySelector('#detalhe')).not.toBeNull();
  });

  it('o valor ganha a cor pedida', () => {
    expect(el().querySelector('.mf-stat-card__valor')?.classList).toContain('mf-stat-card__valor--perigo');
  });

  it('destaque liga a borda e sai quando desligado', () => {
    const card = () => el().querySelector('.mf-stat-card')!;
    expect(card().classList).toContain('mf-stat-card--destaque');

    fixture.componentInstance.destaque = false;
    fixture.detectChanges();
    expect(card().classList).not.toContain('mf-stat-card--destaque');
  });
});
