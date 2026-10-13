import { addMonthsToYearMonth, formatCurrencyBR, formatDateBR, formatDateInput, isoDate, parseCurrencyBR, toDate } from './mask';

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

// Intl usa espaço não separável entre "R$" e o número; normaliza para comparar.
const semNbsp = (s: string) => s.replace(/\u00a0/g, ' ');

describe('formatCurrencyBR', () => {
  it('formata número com símbolo por padrão', () => {
    expect(semNbsp(formatCurrencyBR(1234.56))).toBe('R$ 1.234,56');
  });

  it('formata sem símbolo quando pedido (substitui formataDecimal/formatCurrencyMoney)', () => {
    expect(formatCurrencyBR(1234.5, { simbolo: false })).toBe('1.234,50');
    expect(formatCurrencyBR(0, { simbolo: false })).toBe('0,00');
  });

  it('aceita string já formatada em pt-BR', () => {
    expect(semNbsp(formatCurrencyBR('R$ 1.234,56'))).toBe('R$ 1.234,56');
    expect(formatCurrencyBR('1.234,56', { simbolo: false })).toBe('1.234,56');
  });

  it('trata vazio e inválido como zero', () => {
    expect(semNbsp(formatCurrencyBR(null))).toBe('R$ 0,00');
    expect(semNbsp(formatCurrencyBR(undefined))).toBe('R$ 0,00');
    expect(semNbsp(formatCurrencyBR('abc'))).toBe('R$ 0,00');
  });

  it('formata negativos', () => {
    expect(formatCurrencyBR(-10, { simbolo: false })).toBe('-10,00');
  });
});

describe('parseCurrencyBR', () => {
  it('devolve o próprio número quando recebe number', () => {
    expect(parseCurrencyBR(12.5)).toBe(12.5);
  });

  it('converte texto pt-BR com e sem símbolo', () => {
    expect(parseCurrencyBR('1.234,56')).toBe(1234.56);
    expect(parseCurrencyBR('R$ 1.234,56')).toBe(1234.56);
    expect(parseCurrencyBR('R$\u00a01.234,56')).toBe(1234.56);
    expect(parseCurrencyBR('-1.234,56')).toBe(-1234.56);
  });

  it('devolve null para vazio e inválido', () => {
    expect(parseCurrencyBR(null)).toBeNull();
    expect(parseCurrencyBR(undefined)).toBeNull();
    expect(parseCurrencyBR('')).toBeNull();
    expect(parseCurrencyBR('   ')).toBeNull();
    expect(parseCurrencyBR('abc')).toBeNull();
    expect(parseCurrencyBR(NaN)).toBeNull();
  });

  it('faz ida e volta com formatCurrencyBR', () => {
    expect(parseCurrencyBR(formatCurrencyBR(98765.43))).toBe(98765.43);
    expect(parseCurrencyBR(formatCurrencyBR(98765.43, { simbolo: false }))).toBe(98765.43);
  });
});

describe('formatDateBR', () => {
  it('lê data de calendário (DateOnly da API) literalmente, sem fuso', () => {
    // new Date('2026-10-05') seria meia-noite UTC -> dia 04 em BRT com getters locais
    expect(formatDateBR('2026-10-05')).toBe('05/10/2026');
    expect(formatDateBR('2026-01-01')).toBe('01/01/2026');
  });

  it('exibe instante (timestamptz) no horário local', () => {
    const instante = new Date(2026, 9, 5, 23, 30); // 05/10 23:30 local
    expect(formatDateBR(instante.toISOString())).toBe('05/10/2026');
  });

  it('aceita objeto Date (meia-noite local, como o grid entrega)', () => {
    expect(formatDateBR(new Date(2026, 11, 31))).toBe('31/12/2026');
  });

  it('devolve vazio para nulo e inválido', () => {
    expect(formatDateBR(null)).toBe('');
    expect(formatDateBR(undefined)).toBe('');
    expect(formatDateBR('')).toBe('');
    expect(formatDateBR('abc')).toBe('');
  });
});

describe('isoDate', () => {
  it('devolve a data local de hoje em YYYY-MM-DD', () => {
    const hoje = new Date();
    const esperado = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}-${String(hoje.getDate()).padStart(2, '0')}`;
    expect(isoDate()).toBe(esperado);
  });
});

describe('toDate', () => {
  it('data de calendário vira meia-noite local (não UTC), mantendo o dia', () => {
    const d = toDate('2026-10-06');
    expect([d.getFullYear(), d.getMonth(), d.getDate(), d.getHours()]).toEqual([2026, 9, 6, 0]);
  });

  it('ida e volta com formatDateBR e formatDateInput preserva o dia', () => {
    expect(formatDateBR(toDate('2026-10-06'))).toBe('06/10/2026');
    expect(formatDateInput(toDate('2026-10-06'))).toBe('2026-10-06');
  });

  it('instante ISO continua sendo o mesmo instante', () => {
    expect(toDate('2026-10-06T03:00:00Z').toISOString()).toBe('2026-10-06T03:00:00.000Z');
  });
});
