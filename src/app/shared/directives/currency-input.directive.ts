import { Directive, ElementRef, HostListener, Optional } from '@angular/core';
import { ControlValueAccessor, NgControl } from '@angular/forms';

/** Até 99.999.999.999,99: o decimal(13,2) da API. */
const MAX_DIGITOS = 13;

/**
 * Campo de moeda com digitação tipo caixa: o valor é a sequência de dígitos em centavos, cada
 * dígito entra pela direita (1550 → 15,50), Backspace tira o último e Delete limpa. O cursor fica
 * sempre no fim. Só valores ≥ 0: o sinal do lançamento vem do TipoLancamento, não do valor.
 *
 * Antes a máscara reformatava o texto a cada tecla e reposicionava o cursor, que pulava e fazia
 * os dígitos se acumularem no meio do número.
 */
@Directive({
  selector: '[currencyInput]',
  standalone: true
})
export class CurrencyInputDirective implements ControlValueAccessor {
  private readonly formato = new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  private digitos = '';
  private onChange: (value: number | null) => void = () => {};
  private onTouched: () => void = () => {};

  constructor(private el: ElementRef<HTMLInputElement>, @Optional() ngControl: NgControl) {
    if (ngControl) {
      ngControl.valueAccessor = this;
    }
  }

  writeValue(value: number | null): void {
    this.digitos = typeof value === 'number' && isFinite(value) && value > 0
      ? String(Math.round(value * 100)).slice(-MAX_DIGITOS)
      : '';
    this.exibir();
  }

  registerOnChange(fn: (value: number | null) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(disabled: boolean): void {
    this.el.nativeElement.disabled = disabled;
  }

  @HostListener('keydown', ['$event'])
  onKeydown(evento: KeyboardEvent): void {
    if (evento.ctrlKey || evento.metaKey || evento.altKey) return;

    if (/^\d$/.test(evento.key)) {
      evento.preventDefault();
      if (this.digitos.length < MAX_DIGITOS) this.alterar((this.digitos + evento.key).replace(/^0+/, ''));
    } else if (evento.key === 'Backspace') {
      evento.preventDefault();
      this.alterar(this.digitos.slice(0, -1));
    } else if (evento.key === 'Delete') {
      evento.preventDefault();
      this.alterar('');
    } else if (evento.key.length === 1) {
      // Letras, vírgula, ponto, sinal: não entram.
      evento.preventDefault();
    }
    // Tab, setas, Enter, Esc...: seguem o comportamento normal.
  }

  @HostListener('paste', ['$event'])
  onPaste(evento: ClipboardEvent): void {
    evento.preventDefault();
    const texto = evento.clipboardData?.getData('text') ?? '';
    this.alterar(texto.replace(/\D/g, '').replace(/^0+/, '').slice(0, MAX_DIGITOS));
  }

  /** Digitação que não passou pelo keydown (ex.: teclado virtual): refaz a partir dos dígitos do texto. */
  @HostListener('input')
  onInput(): void {
    this.alterar(this.el.nativeElement.value.replace(/\D/g, '').replace(/^0+/, '').slice(0, MAX_DIGITOS));
  }

  @HostListener('focus')
  @HostListener('click')
  @HostListener('mouseup')
  manterCursorNoFim(): void {
    const input = this.el.nativeElement;
    const fim = input.value.length;
    input.setSelectionRange(fim, fim);
  }

  @HostListener('blur')
  onBlur(): void {
    this.onTouched();
  }

  private alterar(digitos: string): void {
    this.digitos = digitos;
    this.exibir();
    this.onChange(this.valor());
  }

  private valor(): number | null {
    return this.digitos ? Number(this.digitos) / 100 : null;
  }

  private exibir(): void {
    const valor = this.valor();
    this.el.nativeElement.value = valor === null ? '' : this.formato.format(valor);
    this.manterCursorNoFim();
  }
}
