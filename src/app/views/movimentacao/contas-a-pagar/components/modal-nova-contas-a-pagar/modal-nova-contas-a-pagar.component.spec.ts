import { NO_ERRORS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';
import { of } from 'rxjs';

import { ModalNovaContasAPagarComponent } from './modal-nova-contas-a-pagar.component';
import { ContaMensalService } from 'src/app/core/services/conta-mensal.service';
import { CategoryService } from 'src/app/core/services/category.service';
import { CurrencyInputDirective } from 'src/app/shared/directives/currency-input.directive';

/** Valor da nova conta com a máscara única (currencyInput): número no formulário (FE-P2-10). */
describe('ModalNovaContasAPagarComponent', () => {
  let fixture: ComponentFixture<ModalNovaContasAPagarComponent>;
  let service: jasmine.SpyObj<ContaMensalService>;

  beforeEach(() => {
    service = jasmine.createSpyObj<ContaMensalService>('ContaMensalService', ['criar']);
    service.criar.and.returnValue(of({}));
    const categorias = jasmine.createSpyObj<CategoryService>('CategoryService', ['listarAtivas']);
    categorias.listarAtivas.and.returnValue(of([]));
    TestBed.configureTestingModule({
      declarations: [ModalNovaContasAPagarComponent],
      imports: [CommonModule, ReactiveFormsModule, CurrencyInputDirective],
      providers: [
        { provide: ContaMensalService, useValue: service },
        { provide: CategoryService, useValue: categorias }
      ],
      schemas: [NO_ERRORS_SCHEMA]
    });
    fixture = TestBed.createComponent(ModalNovaContasAPagarComponent);
    fixture.componentInstance.dataOperacao = new Date(2026, 9, 1);
    fixture.detectChanges();
  });

  it('sem valor não salva', () => {
    fixture.componentInstance.form.patchValue({ nomeConta: 'Luz', dataOperacao: 10, categoryid: 6 });

    fixture.componentInstance.save();

    expect(service.criar).not.toHaveBeenCalled();
  });

  it('salva o valor como número', () => {
    fixture.componentInstance.form.patchValue({ nomeConta: 'Luz', valor: 15.5, dataOperacao: 10, categoryid: 6 });

    fixture.componentInstance.save();

    expect(service.criar).toHaveBeenCalledWith(jasmine.objectContaining({ value: 15.5 }));
  });
});
