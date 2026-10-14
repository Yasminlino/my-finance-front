import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { Dialog } from 'primeng/dialog';
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
    fixture.componentInstance.form.patchValue({ nomeConta: 'Luz', dataOperacao: 10, categoryid: 6 });

    fixture.componentInstance.save();

    expect(service.criar).not.toHaveBeenCalled();
  });

  it('salva o valor como número', () => {
    fixture.componentInstance.form.patchValue({ nomeConta: 'Luz', valor: 15.5, dataOperacao: 10, categoryid: 6 });

    fixture.componentInstance.save();

    expect(service.criar).toHaveBeenCalledWith(jasmine.objectContaining({ value: 15.5 }));
  });

  it('abre num p-dialog, categoria é p-dropdown e o X fecha sem recarregar (FE-P2-07)', () => {
    const fechado = jasmine.createSpy('closed');
    fixture.componentInstance.closed.subscribe(fechado);
    const dialogo = fixture.debugElement.query(By.directive(Dialog));

    expect(dialogo.componentInstance.header).toBe('Adicionar nova conta');
    expect((fixture.nativeElement as HTMLElement).querySelector('p-dropdown[formControlName=categoryid]')).not.toBeNull();
    dialogo.componentInstance.close(new Event('click'));
    expect(fechado).toHaveBeenCalledOnceWith(false);
  });
});
