import { CategoriaDto } from './categoria.model';
import { TipoMovimentacaoDto } from './tipo-movimentacao.model';

/** PessoaMovimentacaoDTO da API (JSON em camelCase). */
export type PessoaMovimentacaoDto = {
  id: number;
  nomePessoa: string;
  categoriaId: number | null;
  tipoMovimentacaoId: number | null;
  /** "YYYY-MM": leva a alteração aos itens de extrato daquele mês. */
  mesAtualizacao?: string | null;
  categoria?: CategoriaDto | null;
  tipoMovimentacao?: TipoMovimentacaoDto | null;
};

export type PessoaMovimentacaoCreateDto = Omit<PessoaMovimentacaoDto, 'id'>;
