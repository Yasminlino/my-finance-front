import { Component, signal } from '@angular/core';
import { LarguraTelaService } from 'src/app/core/services/largura-tela.service';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
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
    // Desktop: o breadcrumb só aparece fora do celular (card #78).
    TestBed.configureTestingModule({ providers: [provideRouter([]), provideNoopAnimations(), { provide: LarguraTelaService, useValue: { movel: signal(false) } }] });
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

  it('card #78: o título é um h1', () => {
    expect(el().querySelector('h1.mf-page-title')?.textContent?.trim()).toBe('Contas a Pagar');
  });

  it('as ações entram à direita', () => {
    expect(el().querySelector('.mf-page-header__acoes #acao')).not.toBeNull();
  });
});

@Component({
  standalone: true,
  imports: [PageHeaderComponent],
  template: `
    <mf-page-header titulo="PicPay Cred." voltarPara="/extrato-bancario/resumo" voltarRotulo="Extratos" periodoCurto="nov/26">
      <div periodo id="mes">mês</div>
      <button principal id="importar">Importar</button>
    </mf-page-header>
    <mf-page-header titulo="Extratos" />`
})
class DetalheHostComponent {}

/** Card #78: voltar só com rota de cima, mês no [periodo], compactar ao rolar no celular. */
describe('PageHeaderComponent (card #78)', () => {
  it('voltar só aparece no detalhe, com "Voltar para", e navega para a rota de cima', () => {
    TestBed.configureTestingModule({ providers: [provideRouter([]), provideNoopAnimations()] });
    const f = TestBed.createComponent(DetalheHostComponent);
    f.detectChanges();
    const el = f.nativeElement as HTMLElement;
    const [detalhe, principal] = Array.from(el.querySelectorAll('mf-page-header'));
    const navegar = spyOn(TestBed.inject(Router), 'navigateByUrl');

    expect(principal.querySelector('[aria-label^="Voltar"]')).toBeNull();
    (detalhe.querySelector('[aria-label="Voltar para Extratos"]') as HTMLButtonElement).click();
    expect(navegar).toHaveBeenCalledWith('/extrato-bancario/resumo');
    expect(detalhe.querySelector('.mf-ph-periodo #mes')).not.toBeNull();
    expect(detalhe.querySelector('.mf-page-header__acoes #importar')).not.toBeNull();
  });

  it('no celular, ao rolar, compacta e mostra o chip do mês; no desktop não', () => {
    TestBed.configureTestingModule({ providers: [provideRouter([]), provideNoopAnimations()] });
    const f = TestBed.createComponent(DetalheHostComponent);
    f.detectChanges();
    const cabecalho = f.debugElement.children[0].componentInstance as PageHeaderComponent;
    spyOnProperty(window, 'scrollY').and.returnValue(300);

    cabecalho.aoRolar();
    expect(cabecalho.compacto()).toBe(cabecalho.movel());
  });
});
