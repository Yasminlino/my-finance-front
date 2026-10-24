import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { provideRouter } from '@angular/router';

import { UiShowcaseComponent } from './ui-showcase.component';

/** Página /#/ui (só em desenvolvimento): a base de UI inteira numa tela, para conferência visual (card #27). */
describe('UiShowcaseComponent', () => {
  let fixture: ComponentFixture<UiShowcaseComponent>;
  const el = () => fixture.nativeElement as HTMLElement;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideRouter([]), provideNoopAnimations()] });
    fixture = TestBed.createComponent(UiShowcaseComponent);
    fixture.detectChanges();
  });

  it('mostra cada parte da base de UI', () => {
    for (const secao of ['Cores', 'Tipografia', 'Cabeçalho', 'Cards de resumo', 'Barra de filtros',
      'Ícone de categoria', 'Estado vazio', 'Erro de campo', 'Botões', 'Painel de formulário', 'Diálogos']) {
      expect(el().textContent).withContext(secao).toContain(secao);
    }
    expect(el().querySelectorAll('mf-category-icon').length).toBe(7);
    expect(el().querySelectorAll('mf-stat-card').length).toBe(5);
  });

  it('abre o painel de formulário nos dois tamanhos', () => {
    fixture.componentInstance.painel = 'lg';
    fixture.detectChanges();

    expect(document.querySelector('.mf-form-panel--lg')).not.toBeNull();

    // Fecha antes do fim do teste: o p-sidebar aberto ainda animava depois de o injetor ser destruído (NG0205).
    fixture.componentInstance.painel = null;
    fixture.detectChanges();
  });
});
