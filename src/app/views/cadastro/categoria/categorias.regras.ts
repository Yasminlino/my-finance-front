import { CategoriaDto } from 'src/app/core/models/categoria.model';
import { NaturezaOperacao } from 'src/app/shared/enums/natureza-operacao.enum';
import { normalizarNome } from 'src/app/shared/utils/nomes-parecidos';

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

// A comparação de nomes foi para shared (também usada no Cadastro de Contas, card #22).
export { normalizarNome, nomesParecidos } from 'src/app/shared/utils/nomes-parecidos';

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
