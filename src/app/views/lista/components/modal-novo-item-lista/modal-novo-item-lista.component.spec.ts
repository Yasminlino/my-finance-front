import { NO_ERRORS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';
import { of } from 'rxjs';

import { ModalNovoItemListaComponent } from './modal-novo-item-lista.component';
import { ItemListaService } from 'src/app/core/services/item-lista.service';
import { CurrencyInputDirective } from 'src/app/shared/directives/currency-input.directive';

/** Valor do item (opcional) com a máscara única (currencyInput): número no formulário (FE-P2-10). */
describe('ModalNovoItemListaComponent', () => {
  let fixture: ComponentFixture<ModalNovoItemListaComponent>;
  let service: jasmine.SpyObj<ItemListaService>;

  const abrir = (item: any = null) => {
    fixture = TestBed.createComponent(ModalNovoItemListaComponent);
    fixture.componentInstance.listaId = 30;
    fixture.componentInstance.item = item;
    fixture.detectChanges();
  };
  const valor = () => (fixture.nativeElement as HTMLElement).querySelector<HTMLInputElement>('input[formControlName=valor]')!;

  beforeEach(() => {
    service = jasmine.createSpyObj<ItemListaService>('ItemListaService', ['criar', 'atualizar']);
    service.criar.and.returnValue(of(''));
    service.atualizar.and.returnValue(of({}));
    TestBed.configureTestingModule({
      declarations: [ModalNovoItemListaComponent],
      imports: [CommonModule, ReactiveFormsModule, CurrencyInputDirective],
      providers: [{ provide: ItemListaService, useValue: service }],
      schemas: [NO_ERRORS_SCHEMA]
    });
  });

  it('na edição mostra o valor formatado a partir do número', async () => {
    abrir({ id: 1, listaId: 30, descricao: 'Pão', quantidade: 1, valor: 25.5, status: 'PENDENTE' });
    await fixture.whenStable();

    expect(valor().value).toBe('25,50');
  });

  it('salva o valor como número, e sem valor manda vazio', () => {
    abrir();
    fixture.componentInstance.form.patchValue({ descricao: 'Pão', valor: 15.5 });
    fixture.componentInstance.save();
    expect(service.criar).toHaveBeenCalledWith(jasmine.objectContaining({ valor: 15.5 }));

    fixture.componentInstance.form.patchValue({ valor: null });
    fixture.componentInstance.save();
    expect(service.criar.calls.mostRecent().args[0].valor).toBeUndefined();
  });
});
