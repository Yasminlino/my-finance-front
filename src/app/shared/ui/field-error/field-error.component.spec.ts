import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormControl, Validators } from '@angular/forms';

import { FieldErrorComponent } from './field-error.component';

@Component({
  standalone: true,
  imports: [FieldErrorComponent],
  template: `<mf-field-error [control]="campo">Informe o nome.</mf-field-error>`
})
class HostComponent {
  campo = new FormControl('', Validators.required);
}

/** Erro de campo único para os formulários (card #27): só aparece depois que o campo foi mexido. */
describe('FieldErrorComponent', () => {
  let fixture: ComponentFixture<HostComponent>;
  const erro = () => (fixture.nativeElement as HTMLElement).querySelector('small.p-error');

  beforeEach(() => {
    fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
  });

  it('não aparece com o campo intocado, mesmo inválido', () => {
    expect(erro()).toBeNull();
  });

  it('aparece com o texto quando o campo foi tocado e está inválido', () => {
    fixture.componentInstance.campo.markAsTouched();
    fixture.detectChanges();

    expect(erro()?.textContent?.trim()).toBe('Informe o nome.');
  });

  it('some quando o campo fica válido', () => {
    const campo = fixture.componentInstance.campo;
    campo.markAsTouched();
    campo.setValue('Mercado');
    fixture.detectChanges();

    expect(erro()).toBeNull();
  });
});
