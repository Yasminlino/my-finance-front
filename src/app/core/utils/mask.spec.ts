import { addMonthsToYearMonth } from './mask';

describe('addMonthsToYearMonth', () => {
  it('soma meses dentro do mesmo ano', () => {
    expect(addMonthsToYearMonth('2026-01', 3)).toBe('2026-04');
  });

  it('vira o ano quando a soma passa de dezembro (FE-P0-05)', () => {
    // Compra em novembro/2026 em 4x: antes gerava 2026-12, 2026-13, 2026-14
    expect(addMonthsToYearMonth('2026-11', 1)).toBe('2026-12');
    expect(addMonthsToYearMonth('2026-11', 2)).toBe('2027-01');
    expect(addMonthsToYearMonth('2026-11', 3)).toBe('2027-02');
  });

  it('atravessa mais de um ano', () => {
    expect(addMonthsToYearMonth('2026-11', 14)).toBe('2028-01');
  });

  it('mantém o mês com dois dígitos', () => {
    expect(addMonthsToYearMonth('2026-12', 1)).toBe('2027-01');
    expect(addMonthsToYearMonth('2026-09', 0)).toBe('2026-09');
  });

  it('rejeita competência fora do formato YYYY-MM', () => {
    expect(() => addMonthsToYearMonth('novembro', 1)).toThrowError(/Competência inválida/);
  });
});
