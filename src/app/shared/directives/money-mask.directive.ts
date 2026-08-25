import { Directive, ElementRef, HostListener, Input, Optional, OnInit } from '@angular/core';
import { NgControl, NgModel } from '@angular/forms';

@Directive({
  selector: '[appMoneyMaskBR]',
  standalone: true
})
export class MoneyMaskBrDirective implements OnInit {
  @Input('appMoneyMaskBRAsNumber') appMoneyMaskBRAsNumber = false;

  constructor(
    private el: ElementRef<HTMLInputElement>,
    @Optional() private ngControl: NgControl,
    @Optional() private ngModel: NgModel
  ) {}

  ngOnInit(): void {
    if (this.el.nativeElement.value !== undefined && this.el.nativeElement.value !== null) {
      this.formatAndApply(String(this.el.nativeElement.value));
    }
  }

  @HostListener('input', ['$event'])
  onInput(): void {
    const input = this.el.nativeElement;
    this.formatAndApply(input.value);
  }

  private formatAndApply(value: string): void {
    const input = this.el.nativeElement;

    // 1. Remove tudo o que não for número
    const numericOnly = value.replace(/\D/g, '');

    if (!numericOnly) {
      input.value = '';
      this.updateModel(0, '');
      return;
    }

    // 2. Converte para número e divide por 100 para considerar os dois últimos dígitos como centavos
    const numberValue = Number(numericOnly) / 100;

    // 3. Formata no padrão brasileiro (ex: 1053004452 vira "10.530.044,52")
    const formatted = numberValue.toLocaleString('pt-BR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });

    // Atualiza o valor visual estritamente na tela
    input.value = formatted;

    const finalValue = this.appMoneyMaskBRAsNumber ? numberValue : formatted;
    this.updateModel(finalValue, formatted);

    // Mantém o cursor no final do input
    const pos = formatted.length;
    try {
      input.setSelectionRange(pos, pos);
    } catch (e) {}
  }

  private updateModel(finalValue: any, formatted: string): void {
    if (this.ngControl?.control) {
      this.ngControl.control.setValue(finalValue, { emitEvent: false });
    }

    if (this.ngModel) {
      this.ngModel.control?.setValue(finalValue, { emitEvent: false });
    }
  }

  @HostListener('blur')
  onBlur(): void {
    this.formatAndApply(this.el.nativeElement.value);
  }
}