import { AvisoDto, TipoAviso } from '../../models/notificacao.model';

/** Card #73 — regras puras do sino: sem estado e sem Angular. "Agora" vem de fora para os testes. */

export type FiltroAvisos = 'novas' | 'todas';

export type GrupoAvisos = { rotulo: 'Hoje' | 'Esta semana'; avisos: AvisoDto[] };

/** Ícone e cor (paleta --mf-cor-*) de cada tipo. */
export const APARENCIA_AVISO: Record<TipoAviso, { icone: string; cor: 'laranja' | 'vermelho' | 'azul' | 'roxo' | 'verde' }> = {
  'contas-a-vencer': { icone: 'pi pi-calendar-clock', cor: 'laranja' },
  vencidas: { icone: 'pi pi-exclamation-triangle', cor: 'vermelho' },
  fatura: { icone: 'pi pi-credit-card', cor: 'azul' },
  agenda: { icone: 'pi pi-calendar', cor: 'roxo' },
  acertos: { icone: 'pi pi-users', cor: 'verde' }
};

const UM_DIA_MS = 86_400_000;

function inicioDoDia(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function isoLocal(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function diasDesde(desde: string, agora: Date): number {
  return Math.round((inicioDoDia(agora).getTime() - inicioDoDia(new Date(desde)).getTime()) / UM_DIA_MS);
}

/** O título já diz quando acontece ("vence hoje", "fecha em 2 dias"): esses não mostram "há quanto". */
const TEM_DATA_NO_TITULO: TipoAviso[] = ['contas-a-vencer', 'fatura', 'agenda'];

function ehDeHoje(a: AvisoDto, agora: Date): boolean {
  if (TEM_DATA_NO_TITULO.includes(a.tipo) && a.data) return a.data === isoLocal(agora);
  return diasDesde(a.desde, agora) <= 0;
}

/**
 * Hoje = acontece hoje (conta, fatura e agenda pela data) ou passou a valer hoje (vencidas, acertos); o resto vai em
 * "Esta semana".
 */
export function agruparAvisos(avisos: AvisoDto[], filtro: FiltroAvisos, agora: Date): GrupoAvisos[] {
  const visiveis = filtro === 'novas' ? avisos.filter(a => a.novo) : avisos;
  const hoje = visiveis.filter(a => ehDeHoje(a, agora));
  const semana = visiveis.filter(a => !ehDeHoje(a, agora));
  return [
    ...(hoje.length ? [{ rotulo: 'Hoje' as const, avisos: hoje }] : []),
    ...(semana.length ? [{ rotulo: 'Esta semana' as const, avisos: semana }] : [])
  ];
}

const DIAS_SEMANA = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'];

/** Canto direito do card: em "Hoje" nada (o título já diz); em "Esta semana", "ontem" ou o dia ("seg"). */
export function quandoDoAviso(a: AvisoDto, agora: Date): string {
  if (ehDeHoje(a, agora)) return '';
  const n = diasDesde(a.desde, agora);
  if (n <= 0) return '';
  return n === 1 ? 'ontem' : DIAS_SEMANA[new Date(a.desde).getDay()];
}

/** Linha de baixo do card: o detalhe e, em conta e fatura, o valor ("Casa · R$ 250,00"). */
export function linhaDoAviso(a: AvisoDto, dinheiro: (v: number) => string): string {
  const valor = (a.tipo === 'contas-a-vencer' || a.tipo === 'fatura') && a.valor != null ? dinheiro(a.valor) : null;
  return [a.detalhe, valor].filter(Boolean).join(' · ');
}

/** "hoje", "ontem", "há 3 dias". */
export function haQuanto(desde: string, agora: Date): string {
  const n = diasDesde(desde, agora);
  return n <= 0 ? 'hoje' : n === 1 ? 'ontem' : `há ${n} dias`;
}

/** Só as contas a vencer têm "Marcar como paga" no próprio aviso. */
export function podePagar(aviso: AvisoDto): boolean {
  return aviso.tipo === 'contas-a-vencer' && !!aviso.transacaoId;
}

/** "Abrir": a tela de origem já filtrada. */
export function destinoDoAviso(aviso: AvisoDto, hoje: string): { url: string; queryParams?: Record<string, unknown> } {
  switch (aviso.tipo) {
    case 'contas-a-vencer':
      return { url: '/contas-a-pagar', queryParams: { date: aviso.data ?? hoje } };
    case 'vencidas':
      return { url: '/contas-a-pagar', queryParams: { date: hoje } };
    case 'fatura':
      return { url: '/extrato-bancario', queryParams: { bancoId: aviso.bancoId, month: (aviso.data ?? hoje).slice(0, 7) } };
    case 'agenda':
      return aviso.listaId ? { url: `/planejamento/${aviso.listaId}` } : { url: '/planejamento' };
    case 'acertos':
      return { url: '/extrato-bancario', queryParams: { foco: 'acertos' } };
  }
}
