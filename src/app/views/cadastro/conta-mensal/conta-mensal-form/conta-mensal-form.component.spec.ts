import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { Dialog } from 'primeng/dialog';
import { of } from 'rxjs';

import { ContaMensalFormComponent } from './conta-mensal-form.component';
import { ContaService } from 'src/app/core/services/contas.service';
import { AlertService } from 'src/app/shared/components/alert.service';

/** Valor da conta com a máscara única (currencyInput): número no formulário, sem parse de texto (FE-P2-10). */
describe('ContaMensalFormComponent', () => {
  let fixture: ComponentFixture<ContaMensalFormComponent>;
  let service: jasmine.SpyObj<ContaService>;
  const conta = { id: 16, name: 'Inss', value: 89.9, categoryId: 12, status: 1, contaVencimentos: [{ dia: 5 }] };

  const abrir = (registro: any = null) => {
    fixture = TestBed.createComponent(ContaMensalFormComponent);
    fixture.componentRef.setInput('registro', registro);
    fixture.detectChanges();
  };
  const valor = () => (fixture.nativeElement as HTMLElement).querySelector<HTMLInputElement>('input[formControlName=value]')!;

  beforeEach(() => {
    service = jasmine.createSpyObj<ContaService>('ContaService', ['criar', 'atualizar']);
    service.criar.and.returnValue(of({}));
    service.atualizar.and.returnValue(of({}));
    TestBed.configureTestingModule({
      imports: [ContaMensalFormComponent],
      providers: [
        provideNoopAnimations(),
        { provide: ContaService, useValue: service },
        { provide: AlertService, useValue: jasmine.createSpyObj('AlertService', ['success', 'error']) }
      ]
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

  it('abre num p-dialog com o título e o X fecha sem recarregar (FE-P2-07)', () => {
    const fechado = jasmine.createSpy('closed');
    abrir(conta);
    fixture.componentInstance.closed.subscribe(fechado);
    const dialogo = fixture.debugElement.query(By.directive(Dialog));

    expect(dialogo.componentInstance.header).toBe('Editar Conta');
    dialogo.componentInstance.close(new Event('click'));
    expect(fechado).toHaveBeenCalledOnceWith(false);
  });
});
