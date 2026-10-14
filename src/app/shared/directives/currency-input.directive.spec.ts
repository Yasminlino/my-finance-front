import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { By } from '@angular/platform-browser';

import { CurrencyInputDirective } from './currency-input.directive';

@Component({
  standalone: true,
  imports: [FormsModule, CurrencyInputDirective],
  template: `<input currencyInput [(ngModel)]="valor" />`
})
class HostComponent {
  valor: number | null = null;
}

/**
 * Digitação tipo caixa: cada dígito entra pela direita (1550 → 15,50), Backspace tira o último,
 * o cursor fica sempre no fim. Antes o cursor era reposicionado a cada tecla e os dígitos se
 * acumulavam no meio do número.
 */
describe('CurrencyInputDirective', () => {
  let fixture: ComponentFixture<HostComponent>;
  let host: HostComponent;
  let input: HTMLInputElement;

  const tecla = (key: string, extra: KeyboardEventInit = {}) => {
    const evento = new KeyboardEvent('keydown', { key, cancelable: true, bubbles: true, ...extra });
    input.dispatchEvent(evento);
    fixture.detectChanges();
    return evento;
  };
  const digitar = (texto: string) => [...texto].forEach(c => tecla(c));

  beforeEach(async () => {
    fixture = TestBed.createComponent(HostComponent);
    host = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();
    input = fixture.debugElement.query(By.css('input')).nativeElement;
  });

  it('cada dígito entra pela direita, em centavos', () => {
    digitar('1');
    expect(input.value).toBe('0,01');
    expect(host.valor).toBe(0.01);

    digitar('550');
    expect(input.value).toBe('15,50');
    expect(host.valor).toBe(15.5);
  });

  it('formata milhares', () => {
    digitar('123456');
    expect(input.value).toBe('1.234,56');
    expect(host.valor).toBe(1234.56);
  });

  it('Backspace tira o último dígito e, sem dígitos, o valor fica nulo', () => {
    digitar('1550');
    tecla('Backspace');
    expect(input.value).toBe('1,55');
    expect(host.valor).toBe(1.55);

    tecla('Backspace'); tecla('Backspace'); tecla('Backspace');
    expect(input.value).toBe('');
    expect(host.valor).toBeNull();
  });

  it('Delete limpa tudo', () => {
    digitar('1550');
    tecla('Delete');
    expect(input.value).toBe('');
    expect(host.valor).toBeNull();
  });

  it('ignora letras, vírgula, ponto e sinal', () => {
    digitar('1a,.-5');
    expect(input.value).toBe('0,15');
    expect(tecla('x').defaultPrevented).toBeTrue();
  });

  it('deixa passar Tab, setas e atalhos com Ctrl', () => {
    expect(tecla('Tab').defaultPrevented).toBeFalse();
    expect(tecla('ArrowLeft').defaultPrevented).toBeFalse();
    expect(tecla('c', { ctrlKey: true }).defaultPrevented).toBeFalse();
  });

  it('para em 13 dígitos', () => {
    digitar('99999999999999999');
    expect(host.valor).toBe(99999999999.99);
  });

  it('colar usa só os dígitos e substitui o valor', () => {
    digitar('7');
    const dados = new DataTransfer();
    dados.setData('text', 'R$ 1.234,56');
    input.dispatchEvent(new ClipboardEvent('paste', { clipboardData: dados, cancelable: true }));
    fixture.detectChanges();

    expect(input.value).toBe('1.234,56');
    expect(host.valor).toBe(1234.56);
  });

  it('valor vindo da tela continua de onde está', async () => {
    host.valor = 12.34;
    fixture.detectChanges();
    await fixture.whenStable();
    expect(input.value).toBe('12,34');

    digitar('5');
    expect(input.value).toBe('123,45');
    expect(host.valor).toBe(123.45);
  });

  it('mantém o cursor no fim', () => {
    digitar('1550');
    input.setSelectionRange(0, 0);
    input.dispatchEvent(new Event('click'));
    expect(input.selectionStart).toBe(input.value.length);
  });
});
