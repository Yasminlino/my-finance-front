import { Directive, ElementRef, HostListener, OnInit, Optional, forwardRef } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR, NgControl } from '@angular/forms';

@Directive({
    selector: '[currencyInput]',
    standalone: true
})
export class CurrencyInputDirective implements OnInit, ControlValueAccessor {
    private locale = 'pt-BR';
    private onChange: (value: number | null) => void = () => {};
    private onTouched: () => void = () => {};

    constructor(
        private el: ElementRef<HTMLInputElement>,
        @Optional() private ngControl: NgControl
    ) {
        if (this.ngControl) {
            this.ngControl.valueAccessor = this;
        }
    }

    writeValue(value: number | null): void {
        const formatted = this.formatCurrency(value);
        this.el.nativeElement.value = formatted;
    }

    registerOnChange(fn: any): void {
        this.onChange = fn;
    }

    registerOnTouched(fn: any): void {
        this.onTouched = fn;
    }

    ngOnInit(): void {
        // Se o ngControl tem um valor e ele é um número, formata corretamente na inicialização.
        const initialValue = this.ngControl?.control?.value;
        if (typeof initialValue === 'number') {
            this.writeValue(initialValue);
        }
    }

    private digitsToNumberOrNull(digits: string): number | null {
        const d = (digits || '').replace(/\D/g, '');
        if (!d) return null;
        return Number(d) / 100;
    }

    private formatCurrency(value: number | null): string {
        if (value === null) return '';
        return new Intl.NumberFormat(this.locale, {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }).format(value);
    }

    private countDigitsBeforeCursor(text: string, cursorPos: number): number {
        return (text.slice(0, cursorPos).match(/\d/g) || []).length;
    }

    private findCursorPosByDigitCount(formatted: string, digitCount: number): number {
        if (digitCount <= 0) return 0;
        let count = 0;
        for (let i = 0; i < formatted.length; i++) {
            if (/\d/.test(formatted[i])) count++;
            if (count >= digitCount) return i + 1;
        }
        return formatted.length;
    }

    private applyMask(keepCursorPosition = true) {
        const input = this.el.nativeElement;
        const raw = input.value ?? '';
        const cursorPosition = input.selectionStart ?? 0;

        const digitsBeforeCursor = keepCursorPosition ? this.countDigitsBeforeCursor(raw, cursorPosition) : 0;

        const numOrNull = this.digitsToNumberOrNull(raw);

        this.onChange(numOrNull);

        const formatted = this.formatCurrency(numOrNull);
        input.value = formatted;

        if (keepCursorPosition) {
            const newPos = this.findCursorPosByDigitCount(formatted, digitsBeforeCursor);
            queueMicrotask(() => input.setSelectionRange(newPos, newPos));
        }
    }

    @HostListener('input')
    onInput() {
        this.applyMask(true);
    }

    @HostListener('focus')
    onFocus() {
        this.applyMask(true);
        this.onTouched();
    }

    @HostListener('blur')
    onBlur() {
        this.applyMask(false);
    }
}
