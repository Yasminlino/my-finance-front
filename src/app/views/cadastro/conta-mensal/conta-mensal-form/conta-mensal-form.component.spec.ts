import { NO_ERRORS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';
import { of } from 'rxjs';

import { ContaMensalFormComponent } from './conta-mensal-form.component';
import { ContaService } from 'src/app/core/services/contas.service';
import { AlertService } from 'src/app/shared/components/alert.service';
import { CurrencyInputDirective } from 'src/app/shared/directives/currency-input.directive';

/** Valor da conta com a máscara única (currencyInput): número no formulário, sem parse de texto (FE-P2-10). */
describe('ContaMensalFormComponent', () => {
  let fixture: ComponentFixture<ContaMensalFormComponent>;
  let service: jasmine.SpyObj<ContaService>;
  const conta = { id: 16, name: 'Inss', value: 89.9, categoryid: 12, status: 1, contaVencimentos: [{ dia: 5 }] };

  const abrir = (account: any = null) => {
    fixture = TestBed.createComponent(ContaMensalFormComponent);
    fixture.componentInstance.account = account;
    fixture.detectChanges();
  };
  const valor = () => (fixture.nativeElement as HTMLElement).querySelector<HTMLInputElement>('input[formControlName=value]')!;

  beforeEach(() => {
    service = jasmine.createSpyObj<ContaService>('ContaService', ['criar', 'atualizar']);
    service.criar.and.returnValue(of({}));
    service.atualizar.and.returnValue(of({}));
    TestBed.configureTestingModule({
      declarations: [ContaMensalFormComponent],
      imports: [CommonModule, ReactiveFormsModule, CurrencyInputDirective],
      providers: [
        { provide: ContaService, useValue: service },
        { provide: AlertService, useValue: jasmine.createSpyObj('AlertService', ['success', 'error']) }
      ],
      schemas: [NO_ERRORS_SCHEMA]
    });
  });

  it('na edição mostra o valor formatado a partir do número', async () => {
    abrir(conta);
    await fixture.whenStable();

    expect(valor().value).toBe('89,90');
  });

  it('salva o valor como número', () => {
    abrir(conta);
    fixture.componentInstance.form.patchValue({ value: 15.5 });

    fixture.componentInstance.save();

    expect(service.atualizar).toHaveBeenCalledWith(jasmine.objectContaining({ value: 15.5 }));
  });
});
