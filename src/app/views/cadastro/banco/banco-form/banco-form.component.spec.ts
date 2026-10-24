import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { FormPanelComponent } from 'src/app/shared/ui/form-panel/form-panel.component';
import { of } from 'rxjs';

import { BancoFormComponent } from './banco-form.component';
import { BancoService } from 'src/app/core/services/banco.service';
import { AlertService } from 'src/app/shared/components/alert.service';

/**
 * Saldo inicial com a máscara única (currencyInput): número no formulário, sem parse de texto (FE-P2-10).
 * Formulário no painel lateral (mf-form-panel, card #27) com campos PrimeNG (FE-P2-07).
 */
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
        provideNoopAnimations(),
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

  it('abre no painel lateral com o título da operação', () => {
    abrir({ id: 5, nomeBanco: 'NuBank', saldoInicial: 0, ativo: true, tipoCartaoId: 2 });

    const dialogo = fixture.debugElement.query(By.directive(FormPanelComponent));
    expect(dialogo).not.toBeNull();
    expect(dialogo.componentInstance.titulo).toBe('Editar Banco');
  });

  it('fechar pelo X avisa sem recarregar', () => {
    const fechado = jasmine.createSpy('closed');
    abrir();
    fixture.componentInstance.closed.subscribe(fechado);

    fixture.debugElement.query(By.directive(FormPanelComponent)).componentInstance.fechar.emit();

    expect(fechado).toHaveBeenCalledOnceWith(false);
  });

  it('tipo de cartão e status são p-dropdown', () => {
    abrir();

    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('p-dropdown[formControlName=tipoCartaoId]')).not.toBeNull();
    expect(el.querySelector('p-dropdown[formControlName=ativo]')).not.toBeNull();
  });

  it('salvar sem nome marca o campo em vermelho e mostra a mensagem', () => {
    abrir();

    fixture.componentInstance.save();
    fixture.detectChanges();

    const nome = (fixture.nativeElement as HTMLElement).querySelector('input[formControlName=nomeBanco]')!;
    expect(nome.classList).toContain('ng-dirty');
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Informe um nome válido.');
    expect(service.criar).not.toHaveBeenCalled();
  });
});
