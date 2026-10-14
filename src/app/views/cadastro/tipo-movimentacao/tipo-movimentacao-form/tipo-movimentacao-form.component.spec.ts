import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { Dialog } from 'primeng/dialog';
import { of } from 'rxjs';

import { TipoMovimentacaoFormComponent } from './tipo-movimentacao-form.component';
import { TipoMovimentacaoService } from 'src/app/core/services/tipo-movimentacao.service';
import { AlertService } from 'src/app/shared/components/alert.service';

/** Formulário de tipo de movimentação: standalone e recebe o registro em edição por [registro] (FE-P2-11/12). */
describe('TipoMovimentacaoFormComponent', () => {
  let fixture: ComponentFixture<TipoMovimentacaoFormComponent>;
  let service: jasmine.SpyObj<TipoMovimentacaoService>;

  beforeEach(() => {
    service = jasmine.createSpyObj<TipoMovimentacaoService>('TipoMovimentacaoService', ['criar', 'atualizar']);
    service.atualizar.and.returnValue(of({}));
    TestBed.configureTestingModule({
      imports: [TipoMovimentacaoFormComponent],
      providers: [
        provideNoopAnimations(),
        { provide: TipoMovimentacaoService, useValue: service },
        { provide: AlertService, useValue: jasmine.createSpyObj('AlertService', ['success', 'error']) }
      ]
    });
    fixture = TestBed.createComponent(TipoMovimentacaoFormComponent);
    fixture.componentRef.setInput('registro', { id: 10, nomeTipoMovimentacao: 'Açougue', descricao: 'compra de carnes', valorMeta: 400 });
    fixture.detectChanges();
  });

  it('na edição preenche o formulário com o registro', () => {
    expect(fixture.componentInstance.form.value.nomeTipoMovimentacao).toBe('Açougue');
    expect(fixture.componentInstance.form.value.valorMeta).toBe(400);
  });

  it('salva atualizando o registro', () => {
    fixture.componentInstance.form.patchValue({ descricao: 'carnes' });

    fixture.componentInstance.save();

    expect(service.atualizar).toHaveBeenCalledWith(jasmine.objectContaining({ id: 10, descricao: 'carnes' }));
  });

  it('abre num p-dialog com o título e o X fecha sem recarregar (FE-P2-07)', () => {
    const fechado = jasmine.createSpy('closed');
    fixture.componentInstance.closed.subscribe(fechado);
    const dialogo = fixture.debugElement.query(By.directive(Dialog));

    expect(dialogo.componentInstance.header).toBe('Editar Tipo de Movimentação');
    dialogo.componentInstance.close(new Event('click'));
    expect(fechado).toHaveBeenCalledOnceWith(false);
  });
});
