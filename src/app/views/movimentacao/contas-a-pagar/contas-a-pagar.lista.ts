import { LinhaContasMensais } from 'src/app/core/models/conta-mensal.model';
import { formatCurrencyBR, formatDateBR } from 'src/app/core/utils/mask';
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

export interface CriterioFiltro {
  filtro: FiltroSituacao;
  busca: string;
  categorias: string[];
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

  return contas.filter(conta =>
    (!situacaoAlvo || meta[conta.id]?.situacao === situacaoAlvo) &&
    (!alteradas || alteradas.has(conta.id)) &&
    (!categorias.size || categorias.has(conta.categoriaNome)) &&
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

export function categoriasDe(contas: LinhaContasMensais[]): string[] {
  return [...new Set(contas.map(c => c.categoriaNome).filter(Boolean))].sort();
}
