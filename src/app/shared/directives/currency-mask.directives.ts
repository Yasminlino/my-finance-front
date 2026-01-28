import { Directive, ElementRef, HostListener, Input, Optional } from '@angular/core';
import { NgControl } from '@angular/forms';

@Directive({
  selector: '[currencyMask]'
})
export class CurrencyMaskDirective {
  @Input() locale = 'pt-BR';
  @Input() currency = 'BRL';

  private lastNumberValue = 0;

  constructor(
    private el: ElementRef<HTMLInputElement>,
    @Optional() private ngControl: NgControl
  ) {}

  private parseToNumber(raw: string): number {
    if (!raw) return 0;
    // remove tudo que não for dígito
    const digits = raw.replace(/\D/g, '');
    // interpreta como centavos (ex: "1234" => 12.34)
    return Number(digits) / 100;
  }

  private format(n: number): string {
    return new Intl.NumberFormat(this.locale, {
      style: 'currency',
      currency: this.currency,
    }).format(Number(n) || 0);
  }

  @HostListener('input', ['$event'])
  onInput() {
    const input = this.el.nativeElement;
    const numberValue = this.parseToNumber(input.value);
    this.lastNumberValue = numberValue;

    // mantém o FormControl com número (sem máscara)
    if (this.ngControl?.control) {
      this.ngControl.control.setValue(numberValue, { emitEvent: false });
    }

    // mostra digitável (sem R$) enquanto digita (opcional)
    // se quiser já mascarar enquanto digita, dá pra formatar aqui também.
    input.value = input.value.replace(/[^\d]/g, '');
  }

  @HostListener('blur')
  onBlur() {
    // ao sair do campo, exibe como moeda
    this.el.nativeElement.value = this.format(this.lastNumberValue);
  }

  @HostListener('focus')
  onFocus() {
    // ao focar, volta pra dígitos pra facilitar edição
    const digits = String(Math.round((this.lastNumberValue || 0) * 100));
    this.el.nativeElement.value = digits;
  }
}
