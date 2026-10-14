import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { Dialog } from 'primeng/dialog';

import { RegistroUsuarioComponent } from './registro-usuario.component';

/** Registro (ainda sem formulário) num p-dialog (FE-P2-07). */
describe('RegistroUsuarioComponent', () => {
  let fixture: ComponentFixture<RegistroUsuarioComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [RegistroUsuarioComponent],
      providers: [provideNoopAnimations()]
    });
    fixture = TestBed.createComponent(RegistroUsuarioComponent);
    fixture.detectChanges();
  });

  it('abre num p-dialog e o X fecha', () => {
    const fechado = jasmine.createSpy('closeModal');
    fixture.componentInstance.closeModal.subscribe(fechado);
    const dialogo = fixture.debugElement.query(By.directive(Dialog));

    expect(dialogo.componentInstance.header).toBe('Registrar');
    dialogo.componentInstance.close(new Event('click'));
    expect(fechado).toHaveBeenCalledTimes(1);
  });
});
