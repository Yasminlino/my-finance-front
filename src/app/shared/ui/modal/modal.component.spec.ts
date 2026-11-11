import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { ConfirmacaoService } from 'src/app/core/services/confirmacao.service';
import { LarguraTelaService } from 'src/app/core/services/largura-tela.service';
import { ModalComponent, ModalRodapeDirective, TipoModal } from './modal.component';

@Component({
  standalone: true,
  imports: [ModalComponent, ModalRodapeDirective],
  template: `
    @if (aberto) {
      <mf-modal [titulo]="'Dividir lançamento'" [tipo]="tipo" [temAlteracoes]="sujo" [ocupado]="ocupado" (fechar)="aberto = false; fechou = fechou + 1">
        <p class="conteudo">Conteúdo</p>
        <ng-template mfModalRodape><button class="salvar">Salvar</button></ng-template>
      </mf-modal>
    }
  `
})
class TelaComModal {
  aberto = true;
  tipo: TipoModal = 'folha';
  sujo = false;
  ocupado = false;
  fechou = 0;
}

/** Card #80 — mf-modal: p-dialog no desktop; folha (embaixo) ou tela cheia no celular. */
describe('ModalComponent (mf-modal)', () => {
  let fixture: ComponentFixture<TelaComModal>;
  const movel = signal(false);
  let confirmar: jasmine.Spy;
  const body = () => fixture.nativeElement as HTMLElement;
  const modal = () => fixture.debugElement.children[0]?.componentInstance as ModalComponent;

  const abrir = (tipo: TipoModal, celular: boolean) => {
    movel.set(celular);
    fixture = TestBed.createComponent(TelaComModal);
    fixture.componentInstance.tipo = tipo;
    fixture.detectChanges();
  };

  beforeEach(() => {
    confirmar = jasmine.createSpy('confirmar');
    TestBed.configureTestingModule({
      imports: [TelaComModal],
      providers: [
        provideNoopAnimations(),
        { provide: LarguraTelaService, useValue: { movel } },
        { provide: ConfirmacaoService, useValue: { confirmar } }
      ]
    });
  });

  afterEach(() => fixture?.destroy());

  it('desktop: p-dialog centralizado com título, conteúdo e rodapé; sem arrastar', () => {
    abrir('folha', false);
    expect(body().querySelector('.mf-modal--desktop')).not.toBeNull();
    expect(body().querySelector('.p-sidebar')).toBeNull();
    expect(body().querySelector('.mf-modal__titulo')?.textContent).toContain('Dividir lançamento');
    expect(body().querySelector('.conteudo')).not.toBeNull();
    expect(body().querySelector('.mf-modal__rodape .salvar')).not.toBeNull();
    expect(body().querySelector('.p-resizable-handle')).toBeNull();
  });

  it('celular, folha: abre embaixo com a alça', () => {
    abrir('folha', true);
    expect(body().querySelector('.p-sidebar-bottom.mf-modal--folha')).not.toBeNull();
    expect(body().querySelector('.mf-modal__alca')).not.toBeNull();
    expect(body().querySelector('.mf-modal__rodape--movel .salvar')).not.toBeNull();
  });

  it('celular, tela: ocupa a tela toda, com ← no lugar do ×', () => {
    abrir('tela', true);
    expect(body().querySelector('.mf-modal--tela')).not.toBeNull();
    expect(body().querySelector('[aria-label="Voltar"]')).not.toBeNull();
    expect(body().querySelector('[aria-label="Fechar"]')).toBeNull();
  });

  it('fechar sem alterações emite na hora', async () => {
    abrir('folha', false);
    await modal().pedirParaFechar();
    expect(fixture.componentInstance.fechou).toBe(1);
    expect(confirmar).not.toHaveBeenCalled();
  });

  it('com alterações pergunta antes; "Continuar editando" não fecha', async () => {
    abrir('tela', false);
    fixture.componentInstance.sujo = true;
    fixture.detectChanges();

    confirmar.and.resolveTo(false);
    await modal().pedirParaFechar();
    expect(fixture.componentInstance.fechou).toBe(0);

    confirmar.and.resolveTo(true);
    await modal().pedirParaFechar();
    expect(fixture.componentInstance.fechou).toBe(1);
    expect(confirmar.calls.mostRecent().args[1]).toEqual(jasmine.objectContaining({ titulo: 'Sair sem salvar?' }));
  });

  it('ocupado (gravando) não fecha', async () => {
    abrir('folha', false);
    fixture.componentInstance.ocupado = true;
    fixture.detectChanges();
    await modal().pedirParaFechar();
    expect(fixture.componentInstance.fechou).toBe(0);
  });

  it('celular: o voltar do aparelho fecha o modal em vez de sair da página', async () => {
    const empilhar = spyOn(history, 'pushState').and.callThrough();
    abrir('tela', true);
    expect(empilhar).toHaveBeenCalled();

    window.dispatchEvent(new PopStateEvent('popstate', { state: null }));
    await fixture.whenStable();

    expect(fixture.componentInstance.fechou).toBe(1);
  });
});
