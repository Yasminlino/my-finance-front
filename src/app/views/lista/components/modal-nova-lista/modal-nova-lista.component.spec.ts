import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { Dialog } from 'primeng/dialog';
import { of } from 'rxjs';

import { ModalNovaListaComponent } from './modal-nova-lista.component';
import { ListaService } from 'src/app/core/services/lista.service';
import { SharedModule } from 'src/app/shared/shared.module';

/** Nova/editar lista em p-dialog com campos PrimeNG (FE-P2-07). */
describe('ModalNovaListaComponent', () => {
  let fixture: ComponentFixture<ModalNovaListaComponent>;
  let service: jasmine.SpyObj<ListaService>;

  const abrir = (lista: any = null) => {
    fixture = TestBed.createComponent(ModalNovaListaComponent);
    fixture.componentInstance.lista = lista;
    fixture.detectChanges();
  };

  beforeEach(() => {
    service = jasmine.createSpyObj<ListaService>('ListaService', ['criar', 'atualizar']);
    service.criar.and.returnValue(of('Lista criada com sucesso!'));
    service.atualizar.and.returnValue(of({}));
    TestBed.configureTestingModule({
      declarations: [ModalNovaListaComponent],
      imports: [SharedModule],
      providers: [provideNoopAnimations(), { provide: ListaService, useValue: service }]
    });
  });

  it('abre num p-dialog com o título e o X fecha sem recarregar', () => {
    const fechado = jasmine.createSpy('closed');
    abrir({ id: 3, nome: 'Mercado', tipoMovimentacao: 1, status: true });
    fixture.componentInstance.closed.subscribe(fechado);
    const dialogo = fixture.debugElement.query(By.directive(Dialog));

    expect(dialogo.componentInstance.header).toBe('Editar Lista');
    dialogo.componentInstance.close(new Event('click'));
    expect(fechado).toHaveBeenCalledOnceWith(false);
  });

  it('tipo e status são p-dropdown', () => {
    abrir();

    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('p-dropdown[formControlName=tipoMovimentacao]')).not.toBeNull();
    expect(el.querySelector('p-dropdown[formControlName=status]')).not.toBeNull();
  });

  it('sem nome e sem tipo não grava e mostra os erros', () => {
    abrir();

    fixture.componentInstance.save();
    fixture.detectChanges();

    const texto = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(service.criar).not.toHaveBeenCalled();
    expect(texto).toContain('Informe um nome válido.');
    expect(texto).toContain('Selecione um tipo de Lista.');
  });
});
