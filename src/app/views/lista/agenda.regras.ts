import { ItemListaDto, OcorrenciaDto } from 'src/app/core/models/lista.model';

/**
 * Regras da agenda do planejamento (card #69). Datas de calendário como "AAAA-MM-DD" (sem fuso), como a API manda;
 * a semana começa na segunda.
 */

const MESES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
/** Índice = getDay() (0 = domingo). */
const DIAS_CURTOS = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'];
/** 1 = segunda … 7 = domingo, como `diasSemana` da API. */
const DIAS_DA_REGRA: Record<number, string> = { 1: 'Seg', 2: 'Ter', 3: 'Qua', 4: 'Qui', 5: 'Sex', 6: 'Sáb', 7: 'Dom' };

/** Dia local em "AAAA-MM-DD" (toISOString passaria para UTC e mudaria o dia à noite). */
export function isoDe(data: Date): string {
  const mm = String(data.getMonth() + 1).padStart(2, '0');
  const dd = String(data.getDate()).padStart(2, '0');
  return `${data.getFullYear()}-${mm}-${dd}`;
}

/** "AAAA-MM-DD" -> meia-noite local daquele dia. */
export function dataDe(iso: string): Date {
  const [a, m, d] = iso.split('-').map(Number);
  return new Date(a, m - 1, d);
}

export function somarDias(data: Date, dias: number): Date {
  return new Date(data.getFullYear(), data.getMonth(), data.getDate() + dias);
}

export function inicioDaSemana(data: Date): Date {
  const desdeSegunda = (data.getDay() + 6) % 7;
  return somarDias(data, -desdeSegunda);
}

export function diasDaSemana(inicio: Date): string[] {
  return Array.from({ length: 7 }, (_, i) => isoDe(somarDias(inicio, i)));
}

export function rotuloDoDia(iso: string): { semana: string; dia: string } {
  const data = dataDe(iso);
  return { semana: DIAS_CURTOS[data.getDay()], dia: String(data.getDate()) };
}

/** "2 – 8 nov 2026", "26 out – 1 nov 2026" ou "28 dez 2026 – 3 jan 2027". */
export function periodoPtBr(de: string, ate: string): string {
  const a = dataDe(de);
  const b = dataDe(ate);
  const fim = `${b.getDate()} ${MESES[b.getMonth()]} ${b.getFullYear()}`;
  if (a.getFullYear() !== b.getFullYear()) return `${a.getDate()} ${MESES[a.getMonth()]} ${a.getFullYear()} – ${fim}`;
  if (a.getMonth() !== b.getMonth()) return `${a.getDate()} ${MESES[a.getMonth()]} – ${fim}`;
  return `${a.getDate()} – ${fim}`;
}

/** Dia todo (sem hora) primeiro; depois por hora e descrição. */
function porHora(x: OcorrenciaDto, y: OcorrenciaDto): number {
  if (!x.hora !== !y.hora) return x.hora ? 1 : -1;
  return (x.hora ?? '').localeCompare(y.hora ?? '') || x.descricao.localeCompare(y.descricao, 'pt-BR');
}

/** Uma entrada por dia pedido (mesmo vazio), cada uma em ordem de hora; ocorrências fora dos dias ficam de fora. */
export function agruparPorDia(ocorrencias: OcorrenciaDto[], dias: string[]): Record<string, OcorrenciaDto[]> {
  const grupos: Record<string, OcorrenciaDto[]> = {};
  for (const dia of dias) grupos[dia] = [];
  for (const o of ocorrencias) grupos[o.data]?.push(o);
  for (const dia of dias) grupos[dia].sort(porHora);
  return grupos;
}

/** Pendente de um dia que passou, ou de hoje com hora que já passou. Dia todo de hoje não atrasa. */
export function atrasada(o: Pick<OcorrenciaDto, 'data' | 'hora' | 'feito'>, agora: Date): boolean {
  if (o.feito) return false;
  const hoje = isoDe(agora);
  if (o.data < hoje) return true;
  if (o.data > hoje || !o.hora) return false;
  const horaAgora = `${String(agora.getHours()).padStart(2, '0')}:${String(agora.getMinutes()).padStart(2, '0')}`;
  return o.hora.slice(0, 5) < horaAgora;
}

/** "Seg, qua e sex às 07:00, até 30/11/2026"; vazio quando não repete. */
export function resumoDaRegra(item: Pick<ItemListaDto, 'repeticao' | 'diasSemana' | 'hora' | 'repetirAte' | 'data'>): string {
  let texto: string;
  switch (item.repeticao) {
    case 'DIARIA':
      texto = 'Todo dia';
      break;
    case 'SEMANAL': {
      const dias = [...(item.diasSemana ?? [])].sort((a, b) => a - b).map(d => DIAS_DA_REGRA[d]);
      const juntos = dias.length > 1 ? `${dias.slice(0, -1).join(', ')} e ${dias[dias.length - 1].toLowerCase()}` : dias[0] ?? 'Toda semana';
      texto = juntos.charAt(0) + juntos.slice(1).toLowerCase();
      break;
    }
    case 'MENSAL':
      texto = `Todo dia ${item.data ? dataDe(item.data).getDate() : ''}`.trim();
      break;
    default:
      return '';
  }
  if (item.hora) texto += ` às ${item.hora.slice(0, 5)}`;
  if (item.repetirAte) {
    const [a, m, d] = item.repetirAte.split('-');
    texto += `, até ${d}/${m}/${a}`;
  }
  return texto;
}

const DIAS_LONGOS: Record<number, string> = {
  1: 'toda segunda', 2: 'toda terça', 3: 'toda quarta', 4: 'toda quinta', 5: 'toda sexta', 6: 'todo sábado', 7: 'todo domingo'
};

/** A regra em poucas palavras, embaixo do item na agenda: "seg, qua e sex", "toda quinta", "todo dia 5", "não repete". */
export function resumoCurto(item: Pick<ItemListaDto, 'repeticao' | 'diasSemana' | 'data'>): string {
  switch (item.repeticao) {
    case 'DIARIA':
      return 'todo dia';
    case 'SEMANAL': {
      const dias = [...new Set(item.diasSemana ?? [])].sort((a, b) => a - b);
      if (dias.length === 7) return 'todo dia';
      if (dias.length === 1) return DIAS_LONGOS[dias[0]];
      if (!dias.length) return 'toda semana';
      const curtos = dias.map(d => DIAS_DA_REGRA[d].toLowerCase());
      return `${curtos.slice(0, -1).join(', ')} e ${curtos[curtos.length - 1]}`;
    }
    case 'MENSAL':
      return item.data ? `todo dia ${dataDe(item.data).getDate()}` : 'todo mês';
    default:
      return 'não repete';
  }
}

/** "Hoje", "Amanhã" ou "Ontem" perto de hoje; null nos outros dias. */
export function diaRelativo(iso: string, hoje: string): 'Hoje' | 'Amanhã' | 'Ontem' | null {
  if (iso === hoje) return 'Hoje';
  if (iso === isoDe(somarDias(dataDe(hoje), 1))) return 'Amanhã';
  if (iso === isoDe(somarDias(dataDe(hoje), -1))) return 'Ontem';
  return null;
}

/** Título da visão Dia: "Hoje · ter, 3 nov", "qua, 11 nov" e, fora do ano de hoje, "sex, 1 jan 2027". */
export function tituloDoDia(iso: string, hoje: string): string {
  const data = dataDe(iso);
  let texto = `${DIAS_CURTOS[data.getDay()]}, ${data.getDate()} ${MESES[data.getMonth()]}`;
  if (data.getFullYear() !== dataDe(hoje).getFullYear()) texto += ` ${data.getFullYear()}`;
  const relativo = diaRelativo(iso, hoje);
  return relativo ? `${relativo} · ${texto}` : texto;
}
