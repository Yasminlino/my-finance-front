import { CategoriaDto } from 'src/app/core/models/categoria.model';
import { NaturezaOperacao } from 'src/app/shared/enums/natureza-operacao.enum';

/**
 * Regras do Cadastro de Categorias (card #23), sem Angular: a tela, o formulário e os specs usam as mesmas.
 * A API recusa a mesma combinação de tipo e natureza (CategoriaService.ValidarGravacaoAsync).
 */

export type TipoCategoria = 'Despesa' | 'Receita';

/** Naturezas válidas para o tipo: Receita só "Rendimento / Entrada"; Despesa conforme o perfil. */
export function naturezasDoTipo(tipo: string | null | undefined, empresa: boolean): number[] {
  if (tipo === 'Receita') return [NaturezaOperacao.RendimentoEntrada];
  if (tipo === 'Despesa') {
    return empresa
      ? [NaturezaOperacao.Pessoal, NaturezaOperacao.Empresa]
      : [NaturezaOperacao.Essencial, NaturezaOperacao.EstilodeVidaLazer, NaturezaOperacao.ReservaInvestimento];
  }
  return [];
}

export function ehReceita(categoria: Pick<CategoriaDto, 'subcategoria'>): boolean {
  return categoria.subcategoria?.trim().toLowerCase() === 'receita';
}

/** Despesa com "Rendimento / Entrada" ou Receita com natureza de despesa (dados de antes da regra). */
export function tipoNaturezaIncompativel(categoria: Pick<CategoriaDto, 'subcategoria' | 'naturezaOperacao'>): boolean {
  return ehReceita(categoria) !== (categoria.naturezaOperacao === NaturezaOperacao.RendimentoEntrada);
}

/** Nome para comparar: sem acento, minúsculo e com os espaços normalizados. */
export function normalizarNome(nome: string | null | undefined): string {
  return (nome ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim().replace(/\s+/g, ' ');
}

/** Abaixo disso, uma letra de diferença é comum entre nomes legítimos ("Casa" × "Cara"). */
const TAMANHO_MINIMO_PARA_ERRO_DE_DIGITACAO = 5;

/** True se dá para ir de a para b com no máximo uma troca, inclusão ou remoção de letra. */
function umaLetraDeDiferenca(a: string, b: string): boolean {
  if (Math.abs(a.length - b.length) > 1) return false;
  let i = 0;
  while (i < a.length && i < b.length && a[i] === b[i]) i++;
  if (a.length === b.length) return a.slice(i + 1) === b.slice(i + 1);
  return a.length > b.length ? a.slice(i + 1) === b.slice(i) : a.slice(i) === b.slice(i + 1);
}

function parecidos(a: string, b: string): boolean {
  if (a === b) return true;
  return Math.min(a.length, b.length) >= TAMANHO_MINIMO_PARA_ERRO_DE_DIGITACAO && umaLetraDeDiferenca(a, b);
}

/**
 * Para cada categoria com nome parecido com o de outra (igual sem acento, maiúscula e espaços, ou com uma
 * letra de diferença), os nomes das outras. Compara entre tipos também: "Tansferência" (Despesa) ×
 * "Transferência" (Receita). Categoria sem parecida não entra no mapa.
 */
export function nomesParecidos(categorias: readonly CategoriaDto[]): Map<number, string[]> {
  const normalizados = categorias.map(c => ({ categoria: c, nome: normalizarNome(c.nome) }));
  const resultado = new Map<number, string[]>();

  for (const a of normalizados) {
    const outros = normalizados
      .filter(b => b.categoria.id !== a.categoria.id && parecidos(a.nome, b.nome))
      .map(b => b.categoria.nome);
    if (outros.length) resultado.set(a.categoria.id, outros);
  }
  return resultado;
}

export type FiltroTipo = 'todas' | 'despesas' | 'receitas';
export type FiltroSituacao = 'ativas' | 'inativas' | 'todas';
/** "Ordenar por" da lista; `tipo` = receitas primeiro (padrão). */
export type OrdemCategorias = 'tipo' | 'nome' | 'nome-desc' | 'contas' | 'natureza';

export interface FiltroCategorias {
  tipo: FiltroTipo;
  busca: string;
  /** Vazio = todas as naturezas. */
  naturezas: number[];
  situacao: FiltroSituacao;
  ordem: OrdemCategorias;
}

const porNome = (a: CategoriaDto, b: CategoriaDto) => a.nome.localeCompare(b.nome, 'pt-BR');

/** Critério principal de cada ordem; o empate cai no nome (A–Z). */
const ORDENAR: Record<OrdemCategorias, (a: CategoriaDto, b: CategoriaDto) => number> = {
  tipo: (a, b) => Number(ehReceita(b)) - Number(ehReceita(a)),
  nome: () => 0,
  'nome-desc': (a, b) => porNome(b, a),
  contas: (a, b) => (b.quantidadeContas ?? 0) - (a.quantidadeContas ?? 0),
  natureza: (a, b) => a.naturezaOperacao - b.naturezaOperacao
};

function passaSituacao(categoria: CategoriaDto, situacao: FiltroSituacao): boolean {
  return situacao === 'todas' || categoria.ativo === (situacao === 'ativas');
}

/** Tudo do filtro, menos o tipo: é a base dos contadores do seletor Todas / Despesas / Receitas. */
function passaSemTipo(categoria: CategoriaDto, filtro: FiltroCategorias, busca: string): boolean {
  return passaSituacao(categoria, filtro.situacao)
    && (!filtro.naturezas.length || filtro.naturezas.includes(categoria.naturezaOperacao))
    && (!busca || normalizarNome(categoria.nome).includes(busca));
}

export function filtrarCategorias(categorias: readonly CategoriaDto[], filtro: FiltroCategorias): CategoriaDto[] {
  const busca = normalizarNome(filtro.busca);
  return categorias
    .filter(c => passaSemTipo(c, filtro, busca))
    .filter(c => filtro.tipo === 'todas' || (filtro.tipo === 'receitas') === ehReceita(c))
    .sort((a, b) => ORDENAR[filtro.ordem](a, b) || porNome(a, b));
}

export function contarPorTipo(categorias: readonly CategoriaDto[], filtro: FiltroCategorias): Record<FiltroTipo, number> {
  const busca = normalizarNome(filtro.busca);
  const base = categorias.filter(c => passaSemTipo(c, filtro, busca));
  const receitas = base.filter(ehReceita).length;
  return { todas: base.length, despesas: base.length - receitas, receitas };
}

export interface ResumoCategorias {
  despesas: number;
  receitas: number;
  /** Despesas ativas por natureza (a barra), sem as incompatíveis, na ordem da natureza. */
  despesasPorNatureza: { natureza: number; quantidade: number }[];
  /** Despesas ativas com natureza de receita. */
  aRevisar: number;
}

/** Resumo das categorias ativas (as inativas não aparecem para contas novas). */
export function resumoDasCategorias(categorias: readonly CategoriaDto[]): ResumoCategorias {
  const ativas = categorias.filter(c => c.ativo);
  const despesas = ativas.filter(c => !ehReceita(c));
  const porNatureza = new Map<number, number>();
  let aRevisar = 0;

  for (const despesa of despesas) {
    if (tipoNaturezaIncompativel(despesa)) {
      aRevisar++;
      continue;
    }
    porNatureza.set(despesa.naturezaOperacao, (porNatureza.get(despesa.naturezaOperacao) ?? 0) + 1);
  }

  return {
    despesas: despesas.length,
    receitas: ativas.length - despesas.length,
    despesasPorNatureza: [...porNatureza.entries()]
      .sort(([a], [b]) => a - b)
      .map(([natureza, quantidade]) => ({ natureza, quantidade })),
    aRevisar
  };
}
