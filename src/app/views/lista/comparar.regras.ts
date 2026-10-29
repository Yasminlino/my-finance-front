import { ComparacaoListasDto, ItemComparadoDto } from 'src/app/core/models/lista.model';
import { formatCurrencyBR } from 'src/app/core/utils/mask';

/** Regras da tela Comparar planejamentos (card #68). Os números vêm prontos da API (#67, parte 2). */

export type FiltroComparacao = 'MUDANCA' | 'SUBIU' | 'CAIU' | 'NOVOS' | 'SAIRAM' | 'TODOS';
export type GrupoCascata = 'preco' | 'quantidade' | 'novos' | 'sairam';
export type TomTag = 'sobe' | 'desce' | 'novo' | 'saiu' | 'neutro';

export interface BarraCascata {
  chave: 'anterior' | GrupoCascata | 'atual';
  rotulo: string;
  /** Efeito da barra (negativo nos que reduzem); nos totais, o total. */
  valor: number;
  inicio: number;
  fim: number;
  tipo: 'total' | 'sobe' | 'desce' | 'zero';
}

/** Marca de UTF-8 no começo do CSV: sem ela o Excel lê os acentos errado. */
const BOM = String.fromCharCode(0xfeff);
const centavos = (v: number) => Math.round(v * 100) / 100;
const numeroBR = (v: number) => formatCurrencyBR(v, { simbolo: false });

function normalizar(texto: string | null | undefined): string {
  return (texto ?? '').normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().trim();
}

function tem(item: ItemComparadoDto, mudanca: string): boolean {
  return item.mudancas.includes(mudanca as never);
}

function passa(item: ItemComparadoDto, filtro: FiltroComparacao): boolean {
  const novoOuSaiu = tem(item, 'NOVO') || tem(item, 'SAIU');
  switch (filtro) {
    case 'MUDANCA': return item.diferenca !== 0 || item.mudancas.length > 0;
    case 'SUBIU': return item.diferenca > 0 && !novoOuSaiu;
    case 'CAIU': return item.diferenca < 0 && !novoOuSaiu;
    case 'NOVOS': return tem(item, 'NOVO');
    case 'SAIRAM': return tem(item, 'SAIU');
    default: return true;
  }
}

export function contarFiltros(itens: ItemComparadoDto[]): Record<FiltroComparacao, number> {
  const filtros: FiltroComparacao[] = ['MUDANCA', 'SUBIU', 'CAIU', 'NOVOS', 'SAIRAM', 'TODOS'];
  return Object.fromEntries(filtros.map(f => [f, itens.filter(i => passa(i, f)).length])) as Record<FiltroComparacao, number>;
}

/** Mantém a ordem da API (maior impacto primeiro). */
export function filtrarComparacao(itens: ItemComparadoDto[], filtro: FiltroComparacao, busca: string): ItemComparadoDto[] {
  const termo = normalizar(busca);
  return itens.filter(i => passa(i, filtro) && (!termo || normalizar(i.descricao).includes(termo)));
}

/**
 * Cascata: total anterior → Preço → Quantidade → Novos → Saíram → total atual. Cada efeito começa onde o
 * anterior terminou; "Saíram" reduz. O último degrau fecha no total atual (a API garante no centavo).
 */
export function barrasDaCascata(c: ComparacaoListasDto): BarraCascata[] {
  const efeitos: { chave: GrupoCascata; rotulo: string; valor: number }[] = [
    { chave: 'preco', rotulo: 'Preço', valor: c.efeitos.preco },
    { chave: 'quantidade', rotulo: 'Quantidade', valor: c.efeitos.quantidade },
    { chave: 'novos', rotulo: 'Itens novos', valor: c.efeitos.novos },
    { chave: 'sairam', rotulo: 'Itens que saíram', valor: -c.efeitos.sairam }
  ];
  const barras: BarraCascata[] = [{ chave: 'anterior', rotulo: 'Anterior', valor: c.anterior.total, inicio: 0, fim: c.anterior.total, tipo: 'total' }];
  let atual = c.anterior.total;
  for (const e of efeitos) {
    const fim = centavos(atual + e.valor);
    barras.push({ ...e, valor: centavos(e.valor), inicio: atual, fim, tipo: e.valor > 0 ? 'sobe' : e.valor < 0 ? 'desce' : 'zero' });
    atual = fim;
  }
  barras.push({ chave: 'atual', rotulo: 'Atual', valor: c.atual.total, inicio: 0, fim: c.atual.total, tipo: 'total' });
  return barras;
}

/** Itens que explicam cada barra (tooltip da cascata). */
export function itensDoGrupo(itens: ItemComparadoDto[], grupo: GrupoCascata): ItemComparadoDto[] {
  switch (grupo) {
    case 'preco': return itens.filter(i => tem(i, 'PRECO_SUBIU') || tem(i, 'PRECO_CAIU'));
    case 'quantidade': return itens.filter(i => tem(i, 'QUANTIDADE'));
    case 'novos': return itens.filter(i => tem(i, 'NOVO'));
    case 'sairam': return itens.filter(i => tem(i, 'SAIU'));
  }
}

export function tagsDoItem(item: ItemComparadoDto): { rotulo: string; tom: TomTag }[] {
  const tags: { rotulo: string; tom: TomTag }[] = [];
  if (tem(item, 'NOVO')) tags.push({ rotulo: 'Novo', tom: 'novo' });
  if (tem(item, 'SAIU')) tags.push({ rotulo: 'Saiu', tom: 'saiu' });
  if (tem(item, 'PRECO_SUBIU')) tags.push({ rotulo: 'Preço ↑', tom: 'sobe' });
  if (tem(item, 'PRECO_CAIU')) tags.push({ rotulo: 'Preço ↓', tom: 'desce' });
  if (tem(item, 'QUANTIDADE'))
    tags.push({ rotulo: `Qtd ${item.anterior?.quantidade ?? 1}→${item.atual?.quantidade ?? 1}`, tom: 'neutro' });
  return tags;
}

/** "▲ +29,3%", "▼ −10,0%": a direção vai no texto, não só na cor. */
export function percentualComSinal(percentual: number | null | undefined): string {
  if (percentual == null) return '—';
  const numero = Math.abs(percentual).toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  if (percentual > 0) return `▲ +${numero}%`;
  if (percentual < 0) return `▼ −${numero}%`;
  return `${numero}%`;
}

function campoCsv(valor: string): string {
  return /[;"\r\n]/.test(valor) ? `"${valor.replace(/"/g, '""')}"` : valor;
}

/** CSV das linhas mostradas (mesmo filtro da tela), para o Excel em português. */
export function csvDaComparacao(_c: ComparacaoListasDto, itens: ItemComparadoDto[]): string {
  const cabecalho = ['Item', 'Qtd anterior', 'Valor anterior', 'Total anterior', 'Qtd atual', 'Valor atual', 'Total atual', 'Diferença', '%', 'Mudanças'];
  const lado = (l: ItemComparadoDto['anterior']) => l
    ? [l.quantidade == null ? '' : String(l.quantidade), l.valor == null ? '' : numeroBR(l.valor), l.total == null ? '' : numeroBR(l.total)]
    : ['', '', ''];
  const linhas = itens.map(i => [
    i.descricao, ...lado(i.anterior), ...lado(i.atual), numeroBR(i.diferenca),
    i.percentual == null ? '' : i.percentual.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 }),
    tagsDoItem(i).map(t => t.rotulo).join(', ')
  ].map(campoCsv).join(';'));
  return BOM + [cabecalho.join(';'), ...linhas].join('\r\n');
}
