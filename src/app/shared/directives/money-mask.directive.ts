import { Directive, ElementRef, HostListener, Input, Optional } from '@angular/core';
import { NgControl } from '@angular/forms';
import { formatMoneyBRFromAny, parseMoneyBRToNumber } from '../../core/utils/mask';

@Directive({
  selector: '[appMoneyMaskBR]'
})
export class MoneyMaskBrDirective {
  /** Se true, além de setar o texto mascarado, também propaga number pro form/model */
  @Input() appMoneyMaskBRAsNumber = false;

  constructor(
    private el: ElementRef<HTMLInputElement>,
    @Optional() private ngControl: NgControl
  ) {}

  @HostListener('input', ['$event'])
  onInput(): void {
    const input = this.el.nativeElement;
    const formatted = formatMoneyBRFromAny(input.value);

    input.value = formatted;

    // atualiza FormControl se existir (Reactive ou Template-driven)
    if (this.ngControl?.control) {
      if (this.appMoneyMaskBRAsNumber) {
        this.ngControl.control.setValue(parseMoneyBRToNumber(formatted), { emitEvent: false });
      } else {
        this.ngControl.control.setValue(formatted, { emitEvent: false });
      }
    }

    // cursor no final (simples/estável)
    const pos = formatted.length;
    input.setSelectionRange(pos, pos);
  }

  @HostListener('blur')
  onBlur(): void {
    // garante formato ao sair do campo
    this.onInput();
  }
}
