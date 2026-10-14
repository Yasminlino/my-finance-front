import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { of, throwError } from 'rxjs';

import { ModalItemChecagemComponent } from './modal-item-checagem.component';
import { ItemListaService } from 'src/app/core/services/item-lista.service';

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
    service.criar.and.returnValue(of('ItemLista criada com sucesso!'));
    service.atualizar.and.returnValue(of({}));
    TestBed.configureTestingModule({
      declarations: [ModalItemChecagemComponent],
      imports: [CommonModule, ReactiveFormsModule],
      providers: [{ provide: ItemListaService, useValue: service }]
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

    expect(service.criar).toHaveBeenCalledOnceWith({ descricao: 'Pão', quantidade: 2, status: 'PENDENTE', listaId: 31 });
    expect(fechado).toHaveBeenCalledOnceWith(true);
  });

  it('editar um item concluído abre marcado e mantém OK ao salvar', () => {
    abrir({ id: 7, listaId: 31, descricao: 'Pão', quantidade: 1, status: 'OK' });

    expect(modal.form.value.concluido).toBeTrue();
    modal.form.patchValue({ quantidade: 3 });
    modal.salvar();

    expect(service.atualizar).toHaveBeenCalledOnceWith(jasmine.objectContaining({ id: 7, quantidade: 3, status: 'OK' }));
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
});
