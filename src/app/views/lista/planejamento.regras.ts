import { ItemListaDto, ListaDto, ModeloLista } from 'src/app/core/models/lista.model';
import { formatCurrencyBR } from 'src/app/core/utils/mask';

/** Regras da tela interna do planejamento (card #66). O total segue o resumo da API (ResumoListas). */

type CamposDoTotal = Pick<ListaDto, 'modoValor'>;

export type FiltroItens = 'TODOS' | 'FALTA' | 'FEITOS';

export interface ResumoDosItens {
  itens: number;
  feitos: number;
  percentual: number;
  /** Soma dos itens com valor. */
  total: number;
  ok: number;
  falta: number;
  /** Itens sem valor: fora da soma. */
  semValor: number;
  /** limite − total; null sem Limite ligado. */
  disponivel: number | null;
}

const centavos = (valor: number) => Math.round(valor * 100) / 100;

function normalizar(texto: string | null | undefined): string {
  return (texto ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
}

/** UNITARIO: quantidade × valor (sem quantidade, 1); TOTAL: o valor. Sem valor: null, fora da soma. */
export function totalDoItem(item: Pick<ItemListaDto, 'quantidade' | 'valor'>, lista: CamposDoTotal): number | null {
  if (item.valor == null) return null;
  return centavos(lista.modoValor === 'UNITARIO' ? (item.quantidade ?? 1) * item.valor : item.valor);
}

export function resumoDosItens(itens: ItemListaDto[], lista: Pick<ListaDto, 'modoValor' | 'usaLimite' | 'limite'>): ResumoDosItens {
  let total = 0;
  let ok = 0;
  let semValor = 0;
  let feitos = 0;
  for (const item of itens) {
    if (item.feito) feitos++;
    const valor = totalDoItem(item, lista);
    if (valor === null) {
      semValor++;
      continue;
    }
    total += valor;
    if (item.feito) ok += valor;
  }
  total = centavos(total);
  ok = centavos(ok);
  return {
    itens: itens.length,
    feitos,
    percentual: itens.length ? Math.round((feitos / itens.length) * 100) : 0,
    total,
    ok,
    falta: centavos(total - ok),
    semValor,
    disponivel: lista.usaLimite && lista.limite != null ? centavos(lista.limite - total) : null
  };
}

/** Nome do grupo e do filtro de feitos, pelo modelo do planejamento. */
export function rotuloDosFeitos(modelo: ModeloLista): string {
  switch (modelo) {
    case 'COMPRAS': return 'No carrinho';
    case 'ORCAMENTO': return 'OK';
    case 'TAREFAS':
    case 'AGENDA': return 'Concluídas';
    default: return 'Feitos';
  }
}

/** Ordem de inclusão: `ordem` quando há; sem ela, a ordem de criação (id). */
export function ordenarItens(itens: ItemListaDto[]): ItemListaDto[] {
  return [...itens].sort((a, b) =>
    (a.ordem ?? Number.MAX_SAFE_INTEGER) - (b.ordem ?? Number.MAX_SAFE_INTEGER) || a.id - b.id);
}

export function contarItens(itens: ItemListaDto[]): Record<FiltroItens, number> {
  const feitos = itens.filter(i => i.feito).length;
  return { TODOS: itens.length, FALTA: itens.length - feitos, FEITOS: feitos };
}

/** Filtro por feito e busca na descrição e na observação (sem acento nem maiúscula). Mantém a ordem recebida. */
export function filtrarItens(itens: ItemListaDto[], filtro: FiltroItens, busca: string): ItemListaDto[] {
  const termo = normalizar(busca);
  return itens.filter(i =>
    (filtro === 'TODOS' || (filtro === 'FEITOS') === !!i.feito)
    && (!termo || normalizar(i.descricao).includes(termo) || normalizar(i.observacao).includes(termo)));
}

/** Pendentes em cima e feitos no grupo de baixo, cada lado na ordem de inclusão. */
export function separarPorFeito(itens: ItemListaDto[]): { pendentes: ItemListaDto[]; feitos: ItemListaDto[] } {
  const ordenados = ordenarItens(itens);
  return { pendentes: ordenados.filter(i => !i.feito), feitos: ordenados.filter(i => i.feito) };
}

// ---- compartilhar e exportar (parte 2) ----

/** "R$ 10,00" com espaço comum (o Intl põe espaço rígido), para o texto compartilhado. */
const reais = (valor: number) => formatCurrencyBR(valor).replace(/\s/g, ' ');
/** "1.234,50", sem símbolo, para o CSV. */
/** Marca de UTF-8 no começo do CSV: sem ela o Excel lê os acentos errado. */
const BOM = String.fromCharCode(0xfeff);
const numeroBR = (valor: number) => formatCurrencyBR(valor, { simbolo: false });

/** "2026-11-03" -> "03/11" (ou "03/11/2026" com o ano). */
function diaMes(data: string, comAno = false): string {
  const dia = `${data.slice(8, 10)}/${data.slice(5, 7)}`;
  return comAno ? `${dia}/${data.slice(0, 4)}` : dia;
}

/**
 * Texto para mandar por mensagem: o nome e um "☐ item" por pendente, com quantidade, total e data quando ligados;
 * no fim, quanto falta (com Valor).
 */
export function textoDosPendentes(lista: ListaDto, itens: ItemListaDto[]): string {
  const { pendentes } = separarPorFeito(itens);
  if (!pendentes.length) return `${lista.nome}\nTudo feito!`;

  const linhas = pendentes.map(i => {
    let linha = `☐ ${i.descricao}`;
    if (lista.usaQuantidade) linha += ` × ${i.quantidade ?? 1}`;
    const total = lista.usaValor ? totalDoItem(i, lista) : null;
    if (total !== null) linha += ` — ${reais(total)}`;
    if (lista.usaData && i.data) linha += ` (${diaMes(i.data)}${i.hora ? ' ' + i.hora.slice(0, 5) : ''})`;
    return linha;
  });
  // Sem nenhum item com valor, "Falta: R$ 0,00" só confundiria.
  const resumo = resumoDosItens(itens, lista);
  const rodape = lista.usaValor && resumo.semValor < resumo.itens ? `\n\nFalta: ${reais(resumo.falta)}` : '';
  return `${lista.nome}\n${linhas.join('\n')}${rodape}`;
}

/** Campo do CSV entre aspas quando tem ; aspas ou quebra de linha. */
function campoCsv(valor: string): string {
  return /[;"\r\n]/.test(valor) ? `"${valor.replace(/"/g, '""')}"` : valor;
}

/**
 * CSV para o Excel em português: BOM, ";" e números "1.234,50". Só as colunas dos campos ligados; pendentes
 * primeiro, cada grupo na ordem de inclusão.
 */
export function csvDosItens(lista: ListaDto, itens: ItemListaDto[]): string {
  const unitario = lista.modoValor === 'UNITARIO';
  const cabecalho = ['Item', 'Feito'];
  if (lista.usaQuantidade) cabecalho.push('Quantidade');
  if (lista.usaValor) cabecalho.push(...(unitario ? ['Valor unitário', 'Total'] : ['Valor']));
  if (lista.usaData) cabecalho.push('Data', 'Hora');
  if (lista.usaObservacao) cabecalho.push('Observação');

  const { pendentes, feitos } = separarPorFeito(itens);
  const linhas = [...pendentes, ...feitos].map(i => {
    const campos = [i.descricao ?? '', i.feito ? 'Sim' : 'Não'];
    if (lista.usaQuantidade) campos.push(String(i.quantidade ?? 1));
    if (lista.usaValor) {
      const valor = i.valor == null ? '' : numeroBR(i.valor);
      const total = totalDoItem(i, lista);
      campos.push(...(unitario ? [valor, total === null ? '' : numeroBR(total)] : [valor]));
    }
    if (lista.usaData) campos.push(i.data ? diaMes(i.data, true) : '', i.hora ? i.hora.slice(0, 5) : '');
    if (lista.usaObservacao) campos.push(i.observacao ?? '');
    return campos.map(campoCsv).join(';');
  });
  return BOM + [cabecalho.join(';'), ...linhas].join('\r\n');
}
