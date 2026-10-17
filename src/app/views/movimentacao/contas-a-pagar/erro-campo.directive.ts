import { Directive, Input, OnChanges } from '@angular/core';
import { AbstractControl, NG_VALIDATORS, ValidationErrors, Validator } from '@angular/forms';

/**
 * Validator de um campo do modo edição: a regra fica em EdicaoContas.erros() e chega aqui pronta.
 * Com ela o ngModel fica ng-invalid de verdade (sem ng-valid junto, como acontecia com a classe
 * posta à mão), e volta a ng-valid quando o erro some.
 */
@Directive({
  selector: '[appErroCampo]',
  standalone: true,
  providers: [{ provide: NG_VALIDATORS, useExisting: ErroCampoDirective, multi: true }]
})
export class ErroCampoDirective implements Validator, OnChanges {
  /** Mensagem do erro, ou vazio quando o campo está válido. */
  @Input('appErroCampo') erro: string | null | undefined;

  private revalidar?: () => void;

  ngOnChanges(): void {
    this.revalidar?.();
  }

  validate(_controle: AbstractControl): ValidationErrors | null {
    return this.erro ? { edicao: this.erro } : null;
  }

  registerOnValidatorChange(fn: () => void): void {
    this.revalidar = fn;
  }
}
