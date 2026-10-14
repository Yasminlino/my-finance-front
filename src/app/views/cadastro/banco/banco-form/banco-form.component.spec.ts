import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';

import { BancoFormComponent } from './banco-form.component';
import { BancoService } from 'src/app/core/services/banco.service';
import { AlertService } from 'src/app/shared/components/alert.service';

/** Saldo inicial com a máscara única (currencyInput): número no formulário, sem parse de texto (FE-P2-10). */
describe('BancoFormComponent', () => {
  let fixture: ComponentFixture<BancoFormComponent>;
  let service: jasmine.SpyObj<BancoService>;

  const abrir = (registro: any = null) => {
    fixture = TestBed.createComponent(BancoFormComponent);
    fixture.componentRef.setInput('registro', registro);
    fixture.detectChanges();
  };
  const saldo = () => (fixture.nativeElement as HTMLElement).querySelector<HTMLInputElement>('input[formControlName=saldoInicial]')!;

  beforeEach(() => {
    service = jasmine.createSpyObj<BancoService>('BancoService', ['criar', 'atualizar']);
    service.criar.and.returnValue(of({}));
    service.atualizar.and.returnValue(of({}));
    TestBed.configureTestingModule({
      imports: [BancoFormComponent],
      providers: [
        { provide: BancoService, useValue: service },
        { provide: AlertService, useValue: jasmine.createSpyObj('AlertService', ['success', 'error']) }
      ]
    });
  });

  it('na edição mostra o saldo formatado a partir do número', async () => {
    abrir({ id: 5, nomeBanco: 'NuBank', saldoInicial: 1234.56, ativo: true, tipoCartaoId: 2 });
    await fixture.whenStable();

    expect(saldo().value).toBe('1.234,56');
  });

  it('salva o saldo como número', () => {
    abrir({ id: 5, nomeBanco: 'NuBank', saldoInicial: 10, ativo: true, tipoCartaoId: 2 });
    fixture.componentInstance.form.patchValue({ saldoInicial: 15.5 });

    fixture.componentInstance.save();

    expect(service.atualizar).toHaveBeenCalledWith(jasmine.objectContaining({ saldoInicial: 15.5 }));
  });
});
