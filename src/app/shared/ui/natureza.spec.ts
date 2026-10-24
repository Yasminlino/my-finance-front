import { classeDaNatureza } from './natureza';
import { NaturezaOperacao } from '../enums/natureza-operacao.enum';

describe('classeDaNatureza', () => {
  it('cada natureza tem a sua classe de cor (0 a 5)', () => {
    expect(classeDaNatureza(NaturezaOperacao.RendimentoEntrada)).toBe('mf-natureza-0');
    expect(classeDaNatureza(NaturezaOperacao.Essencial)).toBe('mf-natureza-1');
    expect(classeDaNatureza(NaturezaOperacao.EstilodeVidaLazer)).toBe('mf-natureza-2');
    expect(classeDaNatureza(NaturezaOperacao.ReservaInvestimento)).toBe('mf-natureza-3');
    expect(classeDaNatureza(NaturezaOperacao.Pessoal)).toBe('mf-natureza-4');
    expect(classeDaNatureza(NaturezaOperacao.Empresa)).toBe('mf-natureza-5');
  });

  it('sem natureza conhecida, a cor neutra', () => {
    expect(classeDaNatureza(null)).toBe('mf-natureza-neutra');
    expect(classeDaNatureza(undefined)).toBe('mf-natureza-neutra');
    expect(classeDaNatureza(7)).toBe('mf-natureza-neutra');
    expect(classeDaNatureza(-1)).toBe('mf-natureza-neutra');
  });
});
