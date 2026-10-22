import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { Dialog } from 'primeng/dialog';
import { of } from 'rxjs';

import { ModalNovoItemListaComponent } from './modal-novo-item-lista.component';
import { ItemListaService } from 'src/app/core/services/item-lista.service';
import { SharedModule } from 'src/app/shared/shared.module';

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
    service.criar.and.returnValue(of({ id: 30, listaId: 31, descricao: 'X' } as any));
    service.atualizar.and.returnValue(of({}));
    TestBed.configureTestingModule({
      declarations: [ModalNovoItemListaComponent],
      imports: [SharedModule],
      providers: [provideNoopAnimations(), { provide: ItemListaService, useValue: service }]
    });
  });

  it('na edição mostra o valor formatado a partir do número', async () => {
    abrir({ id: 1, listaId: 30, descricao: 'Pão', quantidade: 1, valor: 25.5, situacao: 'PENDENTE' });
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

  it('abre num p-dialog e o X fecha sem recarregar (FE-P2-07)', () => {
    abrir();
    const fechado = jasmine.createSpy('closed');
    fixture.componentInstance.closed.subscribe(fechado);
    const dialogo = fixture.debugElement.query(By.directive(Dialog));

    expect(dialogo.componentInstance.header).toBe('Novo Item');
    dialogo.componentInstance.close(new Event('click'));
    expect(fechado).toHaveBeenCalledOnceWith(false);
  });
});
