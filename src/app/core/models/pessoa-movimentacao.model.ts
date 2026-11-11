import { CategoriaDto } from './categoria.model';
import { TipoMovimentacaoDto } from './tipo-movimentacao.model';

/**
 * PessoaMovimentacaoDTO da API (JSON em camelCase): quem usou o cartão, cadastrada à mão. Toda pessoa menos o "Eu" entra
 * nos Acertos (card #79).
 */
export type PessoaMovimentacaoDto = {
  id: number;
  nomePessoa: string;
  categoriaId: number | null;
  tipoMovimentacaoId: number | null;
  /** A pessoa "Eu" (dono do cartão): uma por usuário, sem renomear nem excluir. Só a API define (card #45). */
  ehTitular?: boolean;
  /** "YYYY-MM": leva a alteração aos itens de extrato daquele mês. */
  mesAtualizacao?: string | null;
  categoria?: CategoriaDto | null;
  tipoMovimentacao?: TipoMovimentacaoDto | null;
};

export type PessoaMovimentacaoCreateDto = Omit<PessoaMovimentacaoDto, 'id'>;
