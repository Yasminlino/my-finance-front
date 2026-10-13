/**
 * Único formatador de moeda (FE-P1-03).
 * Aceita number ou texto pt-BR ("R$ 1.234,56", "1.234,56"); vazio/inválido vira zero.
 *  - padrão:            "R$ 1.234,56"
 *  - { simbolo: false }: "1.234,56"
 */
export function formatCurrencyBR(value: any, opcoes: { simbolo?: boolean } = {}): string {
  const n = parseCurrencyBR(value) ?? 0;
  const simbolo = opcoes.simbolo ?? true;

  return new Intl.NumberFormat(
    'pt-BR',
    simbolo
      ? { style: 'currency', currency: 'BRL' }
      : { minimumFractionDigits: 2, maximumFractionDigits: 2 }
  ).format(n);
}

/**
 * Único parser de moeda (FE-P1-03): "R$ 1.234,56" | "1.234,56" | number -> number.
 * Vazio ou inválido devolve null; quem precisa de número usa `?? 0`.
 * Texto é sempre lido no formato pt-BR (ponto = milhar, vírgula = decimal).
 */
export function parseCurrencyBR(value: any): number | null {
  if (value === null || value === undefined) return null;
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;

  const s = String(value)
    .replace(/R\$/g, '')
    .replace(/\s/g, '')
    .replace(/\./g, '')
    .replace(',', '.');

  if (!s) return null;

  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

export function formatDateInput(value: any): string {
  // garante YYYY-MM-DD (se já vier ok, retorna ok)
  if (!value) return '';
  const s = String(value);
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return '';
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

export function formatYearMonth(date: Date): string {
  return date.getFullYear().toString() + "-" + (date.getMonth() + 1).toString().padStart(2, '0');
}

/**
 * Soma meses a uma competência "YYYY-MM" normalizando a virada de ano.
 * Ex.: addMonthsToYearMonth('2026-11', 3) -> '2027-02'
 */
export function addMonthsToYearMonth(yearMonth: string, months: number): string {
  const [ano, mes] = yearMonth.split('-').map(Number);

  if (!Number.isFinite(ano) || !Number.isFinite(mes)) {
    throw new Error(`Competência inválida: "${yearMonth}". Esperado "YYYY-MM".`);
  }

  // Usa índice de mês base 0 para que o Date normalize ano e mês sozinho.
  const data = new Date(ano, (mes - 1) + months, 1);

  return formatYearMonth(data);
}

export function formatDateVencimento(baseMonth: string | Date, dataOperacao: any): Date {

  let ano: number;
  let mes: number;

  if (typeof baseMonth === 'string') {
    const [y, m] = baseMonth.split('-');
    ano = Number(y);
    mes = Number(m) - 1; // 👈 JS começa em 0
  } else {
    ano = baseMonth.getFullYear();
    mes = baseMonth.getMonth();
  }

  const diaInformado = Number(dataOperacao ?? 1);

  const ultimoDiaMes = new Date(ano, mes + 1, 0).getDate();

  const dia = Math.min(diaInformado, ultimoDiaMes);

  return new Date(ano, mes, dia);
}

/**
 * Única formatação de data para exibição, dd/MM/yyyy (FE-P1-04).
 *
 * Regra de fuso:
 *  - "YYYY-MM-DD" é data de calendário (DateOnly da API, ex.: DataMovimentacao do extrato):
 *    lida literalmente. Passar por `new Date()` a trataria como meia-noite UTC e,
 *    com getters locais, mostraria o dia anterior em BRT.
 *  - Qualquer outro valor é um instante (timestamptz da API, ex.: Transaction.Date,
 *    DataImportacao; ou Date) e é exibido no horário local.
 */
/**
 * Converte texto da API em Date seguindo a mesma regra de fuso do formatDateBR:
 * "YYYY-MM-DD" vira meia-noite LOCAL daquele dia (`new Date('YYYY-MM-DD')` daria
 * meia-noite UTC, que em BRT é o dia anterior); o resto é instante e vai para `new Date()`.
 */
export function toDate(value: string): Date {
  const dataCalendario = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (dataCalendario) {
    const [, yyyy, mm, dd] = dataCalendario;
    return new Date(Number(yyyy), Number(mm) - 1, Number(dd));
  }

  return new Date(value);
}

export function formatDateBR(value: string | Date | null | undefined): string {
  if (!value) return '';

  if (typeof value === 'string') {
    const dataCalendario = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
    if (dataCalendario) {
      const [, yyyy, mm, dd] = dataCalendario;
      return `${dd}/${mm}/${yyyy}`;
    }
  }

  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '';

  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${dd}/${mm}/${yyyy}`;
}

export function formatMoneyBRFromAny(inputValue: string): string {
  const raw = inputValue ?? '';

  // 1) mantém só dígitos
  let digits = raw.replace(/\D/g, '');

  if (!digits) return '';

  // 2) remove zeros à esquerda
  digits = digits.replace(/^0+/, '');
  if (!digits) digits = '0';

  // 3) interpreta como centavos (últimos 2 dígitos)
  const padded = digits.padStart(3, '0');
  const intPart = padded.slice(0, -2);
  const decPart = padded.slice(-2);

  // 4) separador de milhar
  const intWithDots = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, '.');

  return `${intWithDots},${decPart}`;
}

//retorna o dia de hoje (data local) em YYYY-MM-DD, soma com a quantidade de dias que quiser
export function isoDate(dias: number = 0): string {
  const date = new Date();
  date.setDate(date.getDate() + dias);

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}
