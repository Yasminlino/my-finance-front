import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { FormPanelComponent } from 'src/app/shared/ui/form-panel/form-panel.component';
import { of, throwError } from 'rxjs';

import { ModalItemChecagemComponent } from './modal-item-checagem.component';
import { ItemListaService } from 'src/app/core/services/item-lista.service';
import { SharedModule } from 'src/app/shared/shared.module';

/**
 * Item de checagem em formulário Reactive (FE-P2-10). Antes o checkbox comparava status 'Ok' com o
 * 'OK' gravado: editar um item concluído mostrava desmarcado e salvar o desmarcava.
 */
describe('ModalItemChecagemComponent', () => {
  let fixture: ComponentFixture<ModalItemChecagemComponent>;
  let modal: ModalItemChecagemComponent;
  let service: jasmine.SpyObj<ItemListaService>;
  const texto = () => (fixture.nativeElement as HTMLElement).textContent ?? '';

  const abrir = (item: any = null) => {
    fixture = TestBed.createComponent(ModalItemChecagemComponent);
    modal = fixture.componentInstance;
    modal.listaId = 31;
    modal.item = item;
    fixture.detectChanges();
  };

  beforeEach(() => {
    service = jasmine.createSpyObj<ItemListaService>('ItemListaService', ['criar', 'atualizar']);
    service.criar.and.returnValue(of({ id: 30, listaId: 31, descricao: 'X' } as any));
    service.atualizar.and.returnValue(of({}));
    TestBed.configureTestingModule({
      declarations: [ModalItemChecagemComponent],
      imports: [SharedModule],
      providers: [provideNoopAnimations(), { provide: ItemListaService, useValue: service }]
    });
  });

  it('sem descrição ou com quantidade zero não grava e mostra o erro no campo', () => {
    abrir();
    modal.form.patchValue({ descricao: '   ', quantidade: 0 });

    modal.salvar();
    fixture.detectChanges();

    expect(service.criar).not.toHaveBeenCalled();
    expect(texto()).toContain('Informe a descrição.');
    expect(texto()).toContain('A quantidade mínima é 1.');
  });

  it('novo item grava na lista, pendente, e fecha avisando que gravou', () => {
    const fechado = jasmine.createSpy('closed');
    abrir();
    modal.closed.subscribe(fechado);
    modal.form.patchValue({ descricao: ' Pão ', quantidade: 2 });

    modal.salvar();

    expect(service.criar).toHaveBeenCalledOnceWith({ descricao: 'Pão', quantidade: 2, situacao: 'PENDENTE', listaId: 31 });
    expect(fechado).toHaveBeenCalledOnceWith(true);
  });

  it('editar um item concluído abre marcado e mantém OK ao salvar', () => {
    abrir({ id: 7, listaId: 31, descricao: 'Pão', quantidade: 1, situacao: 'OK' });

    expect(modal.form.value.concluido).toBeTrue();
    modal.form.patchValue({ quantidade: 3 });
    modal.salvar();

    expect(service.atualizar).toHaveBeenCalledOnceWith(jasmine.objectContaining({ id: 7, quantidade: 3, situacao: 'OK' }));
  });

  it('erro da API aparece no modal, que continua aberto', () => {
    const fechado = jasmine.createSpy('closed');
    service.criar.and.returnValue(throwError(() => ({ error: { message: 'Lista não encontrada!' } })));
    abrir();
    modal.closed.subscribe(fechado);
    modal.form.patchValue({ descricao: 'Pão' });

    modal.salvar();
    fixture.detectChanges();

    expect(texto()).toContain('Lista não encontrada!');
    expect(fechado).not.toHaveBeenCalled();
  });

  it('abre no painel lateral e o X fecha sem recarregar (FE-P2-07)', () => {
    abrir();
    const fechado = jasmine.createSpy('closed');
    fixture.componentInstance.closed.subscribe(fechado);
    const dialogo = fixture.debugElement.query(By.directive(FormPanelComponent));

    expect(dialogo.componentInstance.titulo).toBe('Novo Item de Checagem');
    dialogo.componentInstance.fechar.emit();
    expect(fechado).toHaveBeenCalledOnceWith(false);
  });
});
