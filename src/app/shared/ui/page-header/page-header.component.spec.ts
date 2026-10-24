import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideNoopAnimations } from '@angular/platform-browser/animations';

import { PageHeaderComponent } from './page-header.component';

@Component({
  standalone: true,
  imports: [PageHeaderComponent],
  template: `
    <mf-page-header titulo="Contas a Pagar" subtitulo="Gerencie despesas e receitas do mês" [mostrarVoltar]="true"
      [breadcrumb]="[{ label: 'Movimentações' }, { label: 'Contas a Pagar' }]" (voltar)="voltou = true">
      <button acoes id="acao">Nova conta</button>
    </mf-page-header>`
})
class HostComponent {
  voltou = false;
}

/** Cabeçalho de página (card #27), tirado do de Contas a Pagar. */
describe('PageHeaderComponent', () => {
  let fixture: ComponentFixture<HostComponent>;
  const el = () => fixture.nativeElement as HTMLElement;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideRouter([]), provideNoopAnimations()] });
    fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
  });

  it('mostra título, subtítulo e breadcrumb', () => {
    expect(el().querySelector('.mf-page-title')?.textContent?.trim()).toBe('Contas a Pagar');
    expect(el().querySelector('.mf-page-subtitle')?.textContent?.trim()).toBe('Gerencie despesas e receitas do mês');
    expect(el().querySelector('p-breadcrumb')?.textContent).toContain('Movimentações');
  });

  it('o botão voltar emite voltar', () => {
    (el().querySelector('[aria-label="Voltar"]') as HTMLButtonElement).click();
    expect(fixture.componentInstance.voltou).toBeTrue();
  });

  it('as ações entram à direita', () => {
    expect(el().querySelector('.mf-page-header__acoes #acao')).not.toBeNull();
  });
});
