import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { Sidebar } from 'primeng/sidebar';

import { FormPanelComponent } from './form-panel.component';

@Component({
  standalone: true,
  imports: [FormPanelComponent],
  template: `
    <mf-form-panel titulo="Nova Categoria" [salvando]="salvando" [tamanho]="tamanho"
      (fechar)="fechou = fechou + 1" (salvar)="salvou = salvou + 1">
      <input id="campo" />
    </mf-form-panel>`
})
class HostComponent {
  salvando = false;
  tamanho: 'md' | 'lg' = 'md';
  fechou = 0;
  salvou = 0;
}

/** Painel lateral dos formulários de cadastro e edição (card #27). */
describe('FormPanelComponent', () => {
  let fixture: ComponentFixture<HostComponent>;
  const el = () => fixture.nativeElement as HTMLElement;
  const host = () => fixture.componentInstance;
  const botao = (rotulo: string) =>
    Array.from(el().querySelectorAll('button')).find(b => b.textContent?.includes(rotulo) || b.getAttribute('aria-label') === rotulo)!;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideNoopAnimations()] });
    fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
  });

  it('abre à direita com o título, o aviso de obrigatórios e o conteúdo', () => {
    const painel = fixture.debugElement.query(By.directive(Sidebar)).componentInstance as Sidebar;
    expect(painel.position).toBe('right');
    expect(el().querySelector('.mf-form-panel__titulo')?.textContent?.trim()).toBe('Nova Categoria');
    expect(el().textContent).toContain('campos obrigatórios');
    expect(el().querySelector('#campo')).not.toBeNull();
  });

  it('o X, o Cancelar e o fechar do painel (Esc, clique fora) emitem fechar', () => {
    botao('Fechar').click();
    botao('Cancelar').click();
    (fixture.debugElement.query(By.directive(Sidebar)).componentInstance as Sidebar).visibleChange.emit(false);

    expect(host().fechou).toBe(3);
    expect(host().salvou).toBe(0);
  });

  it('Salvar emite salvar', () => {
    botao('Salvar').click();

    expect(host().salvou).toBe(1);
  });

  it('salvando põe o Salvar em carregando e não deixa fechar (X, Cancelar, Esc, clique fora)', () => {
    host().salvando = true;
    fixture.detectChanges();
    const painel = fixture.debugElement.query(By.directive(Sidebar)).componentInstance as Sidebar;

    expect(botao('Salvar').classList).toContain('p-button-loading');
    expect(botao('Fechar').disabled).toBeTrue();
    expect(botao('Cancelar').disabled).toBeTrue();
    expect(painel.closeOnEscape).toBeFalse();
    expect(painel.dismissible).toBeFalse();
  });

  it('o tamanho grande muda a largura', () => {
    const painel = () => fixture.debugElement.query(By.directive(Sidebar)).componentInstance as Sidebar;
    expect(painel().styleClass).toContain('mf-form-panel--md');

    host().tamanho = 'lg';
    fixture.detectChanges();
    expect(painel().styleClass).toContain('mf-form-panel--lg');
  });
});
