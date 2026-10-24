import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EmptyStateComponent } from './empty-state.component';

@Component({
  standalone: true,
  imports: [EmptyStateComponent],
  template: `
    <mf-empty-state icone="pi pi-inbox" titulo="Nenhuma conta neste mês." texto="Cadastre a primeira.">
      <button id="acao">Nova conta</button>
    </mf-empty-state>`
})
class HostComponent {}

/** Estado vazio padrão (card #27). */
describe('EmptyStateComponent', () => {
  it('mostra ícone, título, texto e a ação', () => {
    const fixture: ComponentFixture<HostComponent> = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;

    expect(el.querySelector('.mf-empty-state i')?.classList).toContain('pi-inbox');
    expect(el.querySelector('.mf-empty-state__titulo')?.textContent?.trim()).toBe('Nenhuma conta neste mês.');
    expect(el.querySelector('.mf-empty-state__texto')?.textContent?.trim()).toBe('Cadastre a primeira.');
    expect(el.querySelector('#acao')).not.toBeNull();
  });
});
