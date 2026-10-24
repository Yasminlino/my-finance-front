import { Component, Input } from '@angular/core';
import { AbstractControl } from '@angular/forms';

/**
 * Mensagem de erro abaixo de um campo (card #27). Só aparece depois que o campo foi mexido (tocado ou
 * alterado) e enquanto estiver inválido; o texto vem como conteúdo:
 * `<mf-field-error [control]="form.controls.nome">Informe o nome.</mf-field-error>`
 */
@Component({
  selector: 'mf-field-error',
  standalone: true,
  template: `@if (visivel) {<small class="p-error block mt-1"><ng-content /></small>}`
})
export class FieldErrorComponent {
  @Input({ required: true }) control!: AbstractControl;

  get visivel(): boolean {
    return this.control.invalid && (this.control.touched || this.control.dirty);
  }
}
