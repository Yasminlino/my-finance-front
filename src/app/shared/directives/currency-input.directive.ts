import { Directive, ElementRef, HostListener, Optional } from '@angular/core';
import { NgControl } from '@angular/forms';

@Directive({
    selector: '[currencyInput]'
})
export class CurrencyInputDirective {
    private locale = 'pt-BR';
    private currency = 'BRL';

    constructor(
        private el: ElementRef<HTMLInputElement>,
        @Optional() private ngControl: NgControl
    ) { }

    private digitsToNumber(digits: string): number {
        const d = (digits || '').replace(/\D/g, '');
        if (!d) return 0;
        return Number(d) / 100; // centavos
    }

    private formatCurrency(value: number): string {
        return new Intl.NumberFormat(this.locale, {
            style: 'currency',
            currency: this.currency
        }).format(Number(value) || 0);
    }

    private digitsToNumberOrNull(digits: string): number | null {
        const d = (digits || '').replace(/\D/g, '');
        if (!d) return null;            // ✅ se não tem dígitos, é vazio
        return Number(d) / 100;
    }

    /** pega quantos dígitos existiam antes do cursor */
    private countDigitsBeforeCursor(text: string, cursorPos: number): number {
        return (text.slice(0, cursorPos).match(/\d/g) || []).length;
    }

    /** acha a posição do cursor após formatar, com base na quantidade de dígitos */
    private findCursorPosByDigitCount(formatted: string, digitCount: number): number {
        if (digitCount <= 0) return 0;
        let count = 0;
        for (let i = 0; i < formatted.length; i++) {
            if (/\d/.test(formatted[i])) count++;
            if (count === digitCount) return i + 1;
        }
        return formatted.length;
    }

    private applyMask(keepCursor = true) {
        const input = this.el.nativeElement;
        const raw = input.value ?? '';
        const oldCursor = input.selectionStart ?? raw.length;

        const digitsBefore = keepCursor ? this.countDigitsBeforeCursor(raw, oldCursor) : 0;

        const numOrNull = this.digitsToNumberOrNull(raw);

        // ✅ grava no FormControl
        if (this.ngControl?.control) {
            this.ngControl.control.setValue(numOrNull, { emitEvent: false });
        }

        // ✅ se usuário apagou tudo, mantém vazio no input
        if (numOrNull === null) {
            input.value = '';
            return;
        }

        // exibe formatado
        const formatted = this.formatCurrency(numOrNull);
        input.value = formatted;

        if (keepCursor) {
            const newPos = this.findCursorPosByDigitCount(formatted, digitsBefore);
            queueMicrotask(() => input.setSelectionRange(newPos, newPos));
        }
    }
    /** quando o usuário digita */
    @HostListener('input')
    onInput() {
        this.applyMask(true);
    }

    /** quando o campo recebe foco: mantém o valor formatado (não troca por dígitos!) */
    @HostListener('focus')
    onFocus() {
        // garante que ao entrar já esteja formatado
        this.applyMask(false);
        // coloca cursor no final (padrão bom pra editar)
        const input = this.el.nativeElement;
        queueMicrotask(() => input.setSelectionRange(9999, 9999));
    }

    /** quando perde foco: garante formatação */

    @HostListener('blur')
    onBlur() {
        // ✅ se estiver vazio, não força "R$ 0,00"
        if (!this.el.nativeElement.value) return;
        this.applyMask(false);
    }
}
