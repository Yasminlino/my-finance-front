import { FormControl } from '@angular/forms';
import { diasVencimentoValidator, lerDiasVencimento } from './dias-vencimento';

describe('lerDiasVencimento', () => {
  it('lê um dia ou vários separados por vírgula, em ordem', () => {
    expect(lerDiasVencimento('10')).toEqual([10]);
    expect(lerDiasVencimento('20, 5')).toEqual([5, 20]);
    expect(lerDiasVencimento(' 1,15 ,31 ')).toEqual([1, 15, 31]);
    expect(lerDiasVencimento(10)).toEqual([10]);
  });

  it('ignora vírgula sobrando no fim', () => {
    expect(lerDiasVencimento('5, 20,')).toEqual([5, 20]);
  });

  it('recusa dia repetido, fora de 1–31, não numérico ou vazio', () => {
    expect(lerDiasVencimento('5, 5')).toBeNull();
    expect(lerDiasVencimento('0')).toBeNull();
    expect(lerDiasVencimento('32')).toBeNull();
    expect(lerDiasVencimento('5, x')).toBeNull();
    expect(lerDiasVencimento('')).toBeNull();
    expect(lerDiasVencimento(null)).toBeNull();
  });

  it('validator marca o campo inválido', () => {
    expect(diasVencimentoValidator(new FormControl('5, 20'))).toBeNull();
    expect(diasVencimentoValidator(new FormControl('5, 5'))).toEqual({ diasVencimento: true });
  });
});
