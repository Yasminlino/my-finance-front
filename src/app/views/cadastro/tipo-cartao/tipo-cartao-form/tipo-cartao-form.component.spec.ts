import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { Dialog } from 'primeng/dialog';
import { of } from 'rxjs';

import { TipoCartaoFormComponent } from './tipo-cartao-form.component';
import { TipoCartaoService } from 'src/app/core/services/tipo-cartao.service';
import { AlertService } from 'src/app/shared/components/alert.service';

/** Formulário de tipo de cartão: standalone e recebe o registro em edição por [registro] (FE-P2-11/12). */
describe('TipoCartaoFormComponent', () => {
  let fixture: ComponentFixture<TipoCartaoFormComponent>;
  let service: jasmine.SpyObj<TipoCartaoService>;

  beforeEach(() => {
    service = jasmine.createSpyObj<TipoCartaoService>('TipoCartaoService', ['criar', 'atualizar']);
    service.atualizar.and.returnValue(of({}));
    TestBed.configureTestingModule({
      imports: [TipoCartaoFormComponent],
      providers: [
        provideNoopAnimations(),
        { provide: TipoCartaoService, useValue: service },
        { provide: AlertService, useValue: jasmine.createSpyObj('AlertService', ['success', 'error']) }
      ]
    });
    fixture = TestBed.createComponent(TipoCartaoFormComponent);
    fixture.componentRef.setInput('registro', { id: 4, nomeTipoCartao: 'Vale', ehCredito: false, ehSistema: false });
    fixture.detectChanges();
  });

  it('na edição preenche o formulário com o registro', () => {
    expect(fixture.componentInstance.form.value.nomeTipoCartao).toBe('Vale');
    expect(fixture.componentInstance.form.value.ehCredito).toBeFalse();
  });

  it('salva atualizando o registro', () => {
    fixture.componentInstance.form.patchValue({ ehCredito: true });

    fixture.componentInstance.save();

    expect(service.atualizar).toHaveBeenCalledWith(jasmine.objectContaining({ id: 4, ehCredito: true }));
  });

  it('abre num p-dialog com o título e o X fecha sem recarregar (FE-P2-07)', () => {
    const fechado = jasmine.createSpy('closed');
    fixture.componentInstance.closed.subscribe(fechado);
    const dialogo = fixture.debugElement.query(By.directive(Dialog));

    expect(dialogo.componentInstance.header).toBe('Editar Tipo Cartão');
    dialogo.componentInstance.close(new Event('click'));
    expect(fechado).toHaveBeenCalledOnceWith(false);
  });
});
