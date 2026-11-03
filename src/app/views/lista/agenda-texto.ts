import { RepeticaoItem } from 'src/app/core/models/lista.model';
import { dataDe, isoDe, somarDias } from './agenda.regras';

/**
 * Adicionar rápido da agenda (card #69, parte 2): "dentista sex 14h30", "feira toda quinta 8h", "pagar luz dia 10".
 * Acha hora, dia e repetição no texto; o que sobra é a descrição. Sem dia no texto, vale o `padrao` (o dia mostrado).
 */
export interface TextoInterpretado {
  descricao: string;
  /** AAAA-MM-DD; sempre preenchida (do texto ou do padrão). */
  data: string;
  /** HH:mm; null = dia todo. */
  hora: string | null;
  repeticao: RepeticaoItem;
  /** 1 = segunda … 7 = domingo; só na semanal. */
  diasSemana: number[];
  /** O texto tinha um dia (senão a data é o padrão). */
  temDia: boolean;
}

/** Nome (sem acento) -> 1..7. "ter" sozinho fica de fora: é o verbo ("ter aula"); "terça" vale. */
const DIAS: Record<string, number> = {
  segunda: 1, seg: 1, terca: 2, quarta: 3, qua: 3, quinta: 4, qui: 4, sexta: 5, sex: 5, sabado: 6, sab: 6, domingo: 7, dom: 7
};
const DIA = '(segunda|terca|quarta|quinta|sexta|sabado|domingo|seg|qua|qui|sex|sab|dom)(?:s|-feiras?)?';

/** Minúsculas e sem acento, letra a letra (mesmo tamanho do original, para recortar a descrição pelas posições). */
function normalizar(texto: string): string {
  return Array.from(texto).map(c => c.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase().charAt(0) || c).join('');
}

/** Dia 1..7 (segunda = 1) da data. */
function diaDaSemana(data: Date): number {
  return ((data.getDay() + 6) % 7) + 1;
}

/** A próxima data (contando a de partida) que cai em um dos dias da semana. */
function proximoDiaDaSemana(partida: Date, dias: number[]): Date {
  for (let i = 0; i < 7; i++) {
    const d = somarDias(partida, i);
    if (dias.includes(diaDaSemana(d))) return d;
  }
  return partida;
}

/** O próximo "dia N" a partir da partida (pula meses sem esse dia, como 31). */
function proximoDiaDoMes(partida: Date, dia: number): Date {
  for (let m = 0; m < 13; m++) {
    const d = new Date(partida.getFullYear(), partida.getMonth() + m, dia);
    if (d.getDate() === dia && d >= new Date(partida.getFullYear(), partida.getMonth(), partida.getDate())) return d;
  }
  return partida;
}

export function interpretarTexto(texto: string, hoje: Date, padrao: string = isoDe(hoje)): TextoInterpretado {
  const n = normalizar(texto);
  const usados: [number, number][] = [];
  /** Primeiro casamento ainda não usado; marca o trecho para sair da descrição. */
  const achar = (re: RegExp): RegExpExecArray | null => {
    const global = new RegExp(re.source, re.flags.includes('g') ? re.flags : re.flags + 'g');
    let m: RegExpExecArray | null;
    while ((m = global.exec(n))) {
      const ini = m.index;
      const fim = ini + m[0].length;
      if (!usados.some(([a, b]) => ini < b && fim > a)) {
        usados.push([ini, fim]);
        return m;
      }
    }
    return null;
  };

  const dataPadrao = dataDe(padrao);
  let repeticao: RepeticaoItem = 'NENHUMA';
  let diasSemana: number[] = [];
  let data: Date | null = null;
  let hora: string | null = null;
  let diaDoMesFixo: number | null = null;

  // Repetição primeiro ("todo dia 5" não é "todo dia" nem "dia 5").
  let m = achar(/\btodo dia (\d{1,2})\b/);
  if (m) {
    repeticao = 'MENSAL';
    diaDoMesFixo = Number(m[1]);
  } else if (achar(/\b(?:todo mes|todos os meses|mensalmente)\b/)) {
    repeticao = 'MENSAL';
  } else if (achar(/\b(?:todo dia|todos os dias|diariamente)\b/)) {
    repeticao = 'DIARIA';
  } else if ((m = achar(new RegExp(`\\b(?:toda|todo|todas as|todos os)\\s+(${DIA}(?:\\s*(?:,|e)\\s*${DIA})*)\\b`)))) {
    repeticao = 'SEMANAL';
    diasSemana = [...new Set(Array.from(m[1].matchAll(new RegExp(DIA, 'g'))).map(d => DIAS[d[1]]))].sort((a, b) => a - b);
  } else if (achar(/\b(?:toda semana|todas as semanas|semanalmente)\b/)) {
    repeticao = 'SEMANAL';
  }

  // Data com barra antes da hora ("15/11" não é hora).
  if ((m = achar(/\b(\d{1,2})\/(\d{1,2})(?:\/(\d{2}|\d{4}))?\b/))) {
    const dia = Number(m[1]);
    const mes = Number(m[2]) - 1;
    let ano = m[3] ? Number(m[3].length === 2 ? `20${m[3]}` : m[3]) : hoje.getFullYear();
    let d = new Date(ano, mes, dia);
    if (!m[3] && d < new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate())) d = new Date(++ano, mes, dia);
    if (d.getMonth() === mes && d.getDate() === dia) data = d;
  }

  // Hora: "14h30", "14h", "14:30", "9 horas", "às 9".
  if ((m = achar(/(?:\bas\s+)?\b([01]?\d|2[0-3])(?:\s*(?:h|hs|hrs?|horas?)\s*([0-5]\d)?|:([0-5]\d))(?![\w/])/))) {
    hora = `${m[1].padStart(2, '0')}:${m[2] ?? m[3] ?? '00'}`;
  } else if ((m = achar(/\bas\s+([01]?\d|2[0-3])\b(?![/:])/))) {
    hora = `${m[1].padStart(2, '0')}:00`;
  }

  if (!data) {
    if (achar(/\bdepois de amanha\b/)) data = somarDias(hoje, 2);
    else if (achar(/\bamanha\b/)) data = somarDias(hoje, 1);
    else if (achar(/\bhoje\b/)) data = hoje;
    else if ((m = achar(/\bdia (\d{1,2})\b/))) data = proximoDiaDoMes(hoje, Number(m[1]));
    else if ((m = achar(new RegExp(`\\b(?:na |no |nesta |neste |proxima |proximo )?${DIA}\\b`)))) data = proximoDiaDaSemana(hoje, [DIAS[m[1]]]);
  }
  const temDia = !!data || diaDoMesFixo !== null || diasSemana.length > 0;

  // Repetição sem data: começa no próximo dia que encaixa, a partir do padrão.
  if (!data) {
    if (diaDoMesFixo !== null) data = proximoDiaDoMes(dataPadrao, diaDoMesFixo);
    else if (diasSemana.length) data = proximoDiaDaSemana(dataPadrao, diasSemana);
    else data = dataPadrao;
  }
  if (repeticao === 'SEMANAL' && !diasSemana.length) diasSemana = [diaDaSemana(data)];

  const descricao = recortar(texto, usados);
  return { descricao, data: isoDe(data), hora, repeticao, diasSemana, temDia };
}

/** Tira os trechos usados e as palavras de ligação que sobraram nas pontas ("às", "no", "dia", vírgula). */
function recortar(texto: string, usados: [number, number][]): string {
  const chars = Array.from(texto);
  const fora = new Set<number>();
  for (const [a, b] of usados) for (let i = a; i < b; i++) fora.add(i);
  let resto = chars.map((c, i) => (fora.has(i) ? ' ' : c)).join('').replace(/\s+/g, ' ').trim();
  const sobra = /^(?:às|as|no|na|em|de|do|da|dia|,|-|e)\s+|\s+(?:às|as|no|na|em|de|do|da|dia|,|-|e)$|^[,\-]+|[,\-]+$/i;
  for (let antes = ''; antes !== resto; ) {
    antes = resto;
    resto = resto.replace(sobra, '').trim();
  }
  return resto ? resto.charAt(0).toUpperCase() + resto.slice(1) : '';
}
