import { LinhaContasMensais } from 'src/app/core/models/conta-mensal.model';
import { formatCurrencyBR, formatDateBR, parseCurrencyBR } from 'src/app/core/utils/mask';
import { AparenciaCategoria } from 'src/app/shared/ui/aparencia';
import {
  FiltroSituacao, Situacao, TagDoStatus, VencimentoRelativo,
  contarPorSituacao, ehReceita, iconeDaCategoria, situacao, tagDoStatus, vencimentoDe,
  vencimentoRelativo
} from './contas-a-pagar.regras';

/**
 * O que a tabela (desktop) e a lista de cards (mobile) compartilham: o que cada conta mostra,
 * a ordem e os filtros. Puro, sem Angular; "hoje" vem de fora.
 */

/** O que a linha mostra, calculado ao receber as contas e não a cada detecção de mudanças. */
export interface MetaLinha {
  icone: string;
  /** Natureza da categoria (cor do ícone, mf-category-icon); null enquanto as categorias não chegam. */
  natureza: number | null;
  /** Cor escolhida no cadastro da categoria (card #23); vale mais que a da natureza. */
  cor: string | null;
  situacao: Situacao;
  vencimento: string;
  relativo: VencimentoRelativo;
  tag: TagDoStatus;
  receita: boolean;
  valor: string;
  parcela: string;
  progressoParcela: number;
}

export interface OpcaoFiltro {
  label: string;
  value: FiltroSituacao;
  contagem: number;
}

/** Status do filtro (card #61): os gravados mais o "Atrasado" (em aberto e vencida). */
export type StatusFiltro = 'PENDENTE' | 'PAGO NO PRAZO' | 'AGUARDANDO' | 'PAGO ATRASADO' | 'ATRASADO';

export const OPCOES_STATUS_FILTRO: { label: string; value: StatusFiltro }[] = [
  { label: 'Pendente', value: 'PENDENTE' },
  { label: 'Pago no prazo', value: 'PAGO NO PRAZO' },
  { label: 'Aguardando', value: 'AGUARDANDO' },
  { label: 'Pago atrasado', value: 'PAGO ATRASADO' },
  { label: 'Atrasado', value: 'ATRASADO' }
];

/** "Ordenar por" (card #61); vencimento é o padrão. */
export type OrdemContas = 'vencimento' | 'receitas' | 'valor' | 'nome';

export const OPCOES_ORDEM: { label: string; value: OrdemContas }[] = [
  { label: 'Vencimento', value: 'vencimento' },
  { label: 'Receitas primeiro', value: 'receitas' },
  { label: 'Maior valor', value: 'valor' },
  { label: 'Nome', value: 'nome' }
];

export interface CriterioFiltro {
  filtro: FiltroSituacao;
  busca: string;
  categorias: string[];
  /** Card #61: subcategorias e status escolhidos (vazio = todos) e a faixa de valor (null = sem limite). */
  subcategorias?: string[];
  status?: StatusFiltro[];
  valorMin?: number | null;
  valorMax?: number | null;
  /** Ids alterados no modo edição, para o filtro "alteradas". */
  alteradas?: Set<number>;
}

const ROTULOS_FILTRO: Record<FiltroSituacao, string> = {
  todas: 'Todas',
  'a-vencer': 'A vencer',
  vencidas: 'Vencidas',
  pagas: 'Pagas',
  alteradas: 'Alteradas'
};

const SITUACAO_DO_FILTRO: Partial<Record<FiltroSituacao, Situacao>> = {
  'a-vencer': 'a-vencer',
  vencidas: 'atrasada',
  pagas: 'paga'
};

function semAcento(texto: string | null | undefined): string {
  return (texto ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}

export function metaDaConta(
  conta: LinhaContasMensais, hoje: Date, aparencias: ReadonlyMap<number, AparenciaCategoria> = new Map()
): MetaLinha {
  const receita = ehReceita(conta);
  const total = conta.quantidadeParcelas ?? 0;
  const atual = conta.parcelaAtual ?? 0;
  const aparencia = aparencias.get(conta.categoriaId);
  return {
    icone: aparencia?.icone || iconeDaCategoria(conta.categoriaNome),
    natureza: aparencia?.natureza ?? null,
    cor: aparencia?.cor ?? null,
    situacao: situacao(conta, hoje),
    vencimento: formatDateBR(conta.data),
    relativo: vencimentoRelativo(conta, hoje),
    tag: tagDoStatus(conta, hoje),
    receita,
    valor: (receita ? '+ ' : '') + formatCurrencyBR(conta.valor),
    parcela: conta.ehParcelado && total ? `${atual} / ${total}` : '',
    progressoParcela: total ? Math.min(100, atual / total * 100) : 0
  };
}

export function metaDasContas(
  contas: LinhaContasMensais[], hoje: Date, aparencias: ReadonlyMap<number, AparenciaCategoria> = new Map()
): Record<number, MetaLinha> {
  const meta: Record<number, MetaLinha> = {};
  contas.forEach(conta => (meta[conta.id] = metaDaConta(conta, hoje, aparencias)));
  return meta;
}

/** Por vencimento e, no mesmo dia, por nome. Devolve uma cópia. */
export function ordenarPorVencimento(contas: LinhaContasMensais[]): LinhaContasMensais[] {
  return [...contas].sort((a, b) =>
    vencimentoDe(a).getTime() - vencimentoDe(b).getTime() || (a.nome ?? '').localeCompare(b.nome ?? '', 'pt-BR'));
}

export function filtrarContas(
  contas: LinhaContasMensais[],
  meta: Record<number, MetaLinha>,
  criterio: CriterioFiltro
): LinhaContasMensais[] {
  const termo = semAcento(criterio.busca.trim());
  const categorias = new Set(criterio.categorias);
  const situacaoAlvo = SITUACAO_DO_FILTRO[criterio.filtro];
  const alteradas = criterio.filtro === 'alteradas' ? criterio.alteradas ?? new Set<number>() : null;
  const subcategorias = new Set(criterio.subcategorias ?? []);
  const status = new Set(criterio.status ?? []);
  const min = criterio.valorMin ?? null;
  const max = criterio.valorMax ?? null;

  return contas.filter(conta =>
    (!situacaoAlvo || meta[conta.id]?.situacao === situacaoAlvo) &&
    (!alteradas || alteradas.has(conta.id)) &&
    (!categorias.size || categorias.has(conta.categoriaNome)) &&
    (!subcategorias.size || subcategorias.has(conta.subcategoriaNome ?? '')) &&
    (!status.size || status.has(statusParaFiltro(conta, meta[conta.id]))) &&
    (min === null || valorDe(conta) >= min) &&
    (max === null || valorDe(conta) <= max) &&
    (!termo || [conta.nome, conta.categoriaNome, conta.observacao].some(t => semAcento(t).includes(termo)))
  );
}

/** Opções do filtro de situação com os contadores do mês; "Alteradas" só no modo edição. */
export function opcoesDeFiltro(contas: LinhaContasMensais[], hoje: Date, alteradas?: number): OpcaoFiltro[] {
  const contagem = contarPorSituacao(contas, hoje);
  const opcoes: OpcaoFiltro[] = (['todas', 'a-vencer', 'vencidas', 'pagas'] as const)
    .map(value => ({ label: ROTULOS_FILTRO[value], value, contagem: contagem[value] }));

  if (alteradas !== undefined) {
    opcoes.push({ label: ROTULOS_FILTRO.alteradas, value: 'alteradas', contagem: alteradas });
  }
  return opcoes;
}

/** O status da conta para o filtro: em aberto e vencida conta como "Atrasado". */
export function statusParaFiltro(conta: LinhaContasMensais, meta: MetaLinha | undefined): StatusFiltro {
  if (meta?.situacao === 'atrasada') return 'ATRASADO';
  return (conta.situacao as StatusFiltro) || 'PENDENTE';
}

/** Valor em número (a linha pode trazer o valor formatado do modo edição). */
export function valorDe(conta: LinhaContasMensais): number {
  return Math.abs(parseCurrencyBR(conta.valor) ?? 0);
}

/** Subcategorias do mês, sem repetir, em ordem alfabética (filtro do card #61). */
export function subcategoriasDe(contas: LinhaContasMensais[]): string[] {
  return [...new Set(contas.map(c => c.subcategoriaNome ?? '').filter(Boolean))].sort((a, b) => a.localeCompare(b, 'pt-BR'));
}

/** "Ordenar por" (card #61). Sempre desempata por vencimento e nome. Devolve uma cópia. */
export function ordenarContas(contas: LinhaContasMensais[], ordem: OrdemContas, meta: Record<number, MetaLinha>): LinhaContasMensais[] {
  const porVencimento = ordenarPorVencimento(contas);
  const posicao = new Map(porVencimento.map((c, i) => [c.id, i]));
  const desempate = (a: LinhaContasMensais, b: LinhaContasMensais) => (posicao.get(a.id) ?? 0) - (posicao.get(b.id) ?? 0);
  switch (ordem) {
    case 'receitas':
      return porVencimento.sort((a, b) => Number(!!meta[b.id]?.receita) - Number(!!meta[a.id]?.receita) || desempate(a, b));
    case 'valor':
      return porVencimento.sort((a, b) => valorDe(b) - valorDe(a) || desempate(a, b));
    case 'nome':
      return porVencimento.sort((a, b) => (a.nome ?? '').localeCompare(b.nome ?? '', 'pt-BR') || desempate(a, b));
    default:
      return porVencimento;
  }
}

export function categoriasDe(contas: LinhaContasMensais[]): string[] {
  return [...new Set(contas.map(c => c.categoriaNome).filter(Boolean))].sort();
}
