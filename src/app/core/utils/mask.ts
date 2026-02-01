export function formatCurrencyBR(value: any): string {
  // aceita "R$ 1.234,56", "1234,56", "1234.56", number...
  const n = removeFormatCurrencyBR(value);
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(n);
}

export function removeFormatCurrencyBR(value: any): number {
  if (value === null || value === undefined) return 0;
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0;

  const s = String(value)
    .replace(/[R$\s]/g, '')
    .replace(/\./g, '')
    .replace(',', '.');

  const n = Number(s);
  return Number.isFinite(n) ? n : 0;
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
export function formatCurrencyMoney(value: any): string {
  const n = parseBRLToNumber(value);
  return new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n);
}

function parseBRLToNumber(value: any): number {
  if (value === null || value === undefined || value === '') return 0;
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0;

  let s = String(value).trim();
  s = s.replace(/R\$\s?/g, '');
  s = s.replace(/\./g, '').replace(/,/g, '.');
  const n = Number(s);
  return Number.isFinite(n) ? n : 0;
}


export function formatYearMonth(value: string): string {
  // entrada type="month": YYYY-MM
  // você usava formatDateMonth no React (pra API)
  // aqui devolve o mesmo "YYYY-MM"
  return value || '';
}

export function formatDateVencimento(baseMonth: string | Date, dataOperacao?: any): Date {
  const [ano, mes ] = baseMonth.toString().split('-');  
  const yyyy = ano;
  const mm = mes;
  const dd = dataOperacao ?? '01';
  var data = `${yyyy}-${mm}-${dd}`;
  return new Date(data);
}