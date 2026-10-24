import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { FormPanelComponent } from 'src/app/shared/ui/form-panel/form-panel.component';
import { of } from 'rxjs';

import { ModalNovaListaComponent } from './modal-nova-lista.component';
import { ListaService } from 'src/app/core/services/lista.service';
import { SharedModule } from 'src/app/shared/shared.module';

/** Nova/editar lista no painel lateral (mf-form-panel, card #27) com campos PrimeNG (FE-P2-07). */
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
    service.criar.and.returnValue(of({ id: 8, nome: 'X' } as any));
    service.atualizar.and.returnValue(of({}));
    TestBed.configureTestingModule({
      declarations: [ModalNovaListaComponent],
      imports: [SharedModule],
      providers: [provideNoopAnimations(), { provide: ListaService, useValue: service }]
    });
  });

  it('abre no painel lateral com o título e o X fecha sem recarregar', () => {
    const fechado = jasmine.createSpy('closed');
    abrir({ id: 3, nome: 'Mercado', tipoMovimentacao: 1, ativo: true });
    fixture.componentInstance.closed.subscribe(fechado);
    const dialogo = fixture.debugElement.query(By.directive(FormPanelComponent));

    expect(dialogo.componentInstance.titulo).toBe('Editar Lista');
    dialogo.componentInstance.fechar.emit();
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
