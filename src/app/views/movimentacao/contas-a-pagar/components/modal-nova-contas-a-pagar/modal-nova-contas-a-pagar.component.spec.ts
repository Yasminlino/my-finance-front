import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { FormPanelComponent } from 'src/app/shared/ui/form-panel/form-panel.component';
import { of } from 'rxjs';

import { ModalNovaContasAPagarComponent } from './modal-nova-contas-a-pagar.component';
import { ContaMensalService } from 'src/app/core/services/conta-mensal.service';
import { CategoryService } from 'src/app/core/services/category.service';
import { SharedModule } from 'src/app/shared/shared.module';

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
      imports: [SharedModule],
      providers: [
        provideNoopAnimations(),
        { provide: ContaMensalService, useValue: service },
        { provide: CategoryService, useValue: categorias }
      ]
    });
    fixture = TestBed.createComponent(ModalNovaContasAPagarComponent);
    fixture.componentInstance.dataOperacao = new Date(2026, 9, 1);
    fixture.detectChanges();
  });

  it('sem valor não salva', () => {
    fixture.componentInstance.form.patchValue({ nomeConta: 'Luz', dataOperacao: '10', categoryId: 6 });

    fixture.componentInstance.save();

    expect(service.criar).not.toHaveBeenCalled();
  });

  it('salva o valor como número', () => {
    fixture.componentInstance.form.patchValue({ nomeConta: 'Luz', valor: 15.5, dataOperacao: '10', categoryId: 6 });

    fixture.componentInstance.save();

    expect(service.criar).toHaveBeenCalledWith(jasmine.objectContaining({ valor: 15.5 }));
  });

  it('aceita vários dias: envia os dias em ordem e a data do primeiro', () => {
    fixture.componentInstance.form.patchValue({ nomeConta: 'Escola', valor: 300, dataOperacao: '20, 5', categoryId: 6 });

    fixture.componentInstance.save();

    const payload = service.criar.calls.mostRecent().args[0];
    expect(payload.diasVencimento).toEqual([5, 20]);
    expect((payload.data as Date).getDate()).toBe(5);
  });

  it('um dia só continua funcionando', () => {
    fixture.componentInstance.form.patchValue({ nomeConta: 'Luz', valor: 15.5, dataOperacao: '10', categoryId: 6 });

    fixture.componentInstance.save();

    expect(service.criar).toHaveBeenCalledWith(jasmine.objectContaining({ diasVencimento: [10] }));
  });

  it('dia repetido ou maior que 31 não salva e marca o campo', () => {
    for (const dias of ['5, 5', '32']) {
      fixture.componentInstance.form.patchValue({ nomeConta: 'Luz', valor: 15.5, dataOperacao: dias, categoryId: 6 });

      fixture.componentInstance.save();

      expect(fixture.componentInstance.erro('dataOperacao')).toBeTrue();
    }
    expect(service.criar).not.toHaveBeenCalled();
  });

  it('abre no painel lateral, categoria é p-dropdown e o X fecha sem recarregar (FE-P2-07)', () => {
    const fechado = jasmine.createSpy('closed');
    fixture.componentInstance.closed.subscribe(fechado);
    const dialogo = fixture.debugElement.query(By.directive(FormPanelComponent));

    expect(dialogo.componentInstance.titulo).toBe('Adicionar nova conta');
    expect((fixture.nativeElement as HTMLElement).querySelector('p-dropdown[formControlName=categoryId]')).not.toBeNull();
    dialogo.componentInstance.fechar.emit();
    expect(fechado).toHaveBeenCalledOnceWith(false);
  });
});
