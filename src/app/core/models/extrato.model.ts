import { CategoriaDto } from './categoria.model';
import { PessoaMovimentacaoDto } from './pessoa-movimentacao.model';
import { TipoMovimentacaoDto } from './tipo-movimentacao.model';

/** ExtratoBancarioItemDTO da API (JSON em camelCase). Data é "YYYY-MM-DD" (DateOnly). */
export interface ExtratoItemDto {
  /** Ausente num item novo. */
  id: number;
  extratoBancarioId?: number | null;
  dataMovimentacao: string;
  valor: number;
  /** Entrada | Saída (CHECK do banco). */
  tipoLancamento: string;

  descricao?: string | null;
  observacao?: string | null;
  identificador?: string | null;

  pessoaMovimentacaoId?: number | null;
  nomePessoaTransacao?: string | null;
  /** No create, a pessoa escolhida no autocomplete: a API usa id, nome, categoria e tipo dela. */
  pessoaMovimentacao?: PessoaMovimentacaoDto | null;

  bancoId?: number | null;
  bancoNome?: string | null;
  tipoCartaoId?: number | null;
  tipoCartaoNome?: string | null;

  categoriaId?: number | null;
  categoriaNome?: string | null;
  tipoMovimentacaoId?: number | null;
  tipoMovimentacaoNome?: string | null;

  // cartão de crédito
  numeroFatura?: string | null;
  ehParcelado?: boolean | null;
  parcelaAtual?: number | null;
  quantidadeParcelas?: number | null;

  usuarioId?: number;
  chaveDescricao?: string | null;
  /** Pede à API para atualizar também o vínculo da pessoa com categoria/tipo. */
  alteraVinculoPessoa?: boolean;

  categoria?: Pick<CategoriaDto, 'id' | 'nome' | 'subcategoria'> | null;
  tipoMovimentacao?: Pick<TipoMovimentacaoDto, 'id' | 'nomeTipoMovimentacao'> | null;
}

/** ExtratoBancarioDTO da API: o cabeçalho de uma importação. */
export interface ExtratoBancarioDto {
  id: number;
  dataImportacao: string;
  dataInicioPeriodo: string | null;
  dataFimPeriodo: string | null;
  bancoId: number;
  bancoNome: string | null;
  tipoCartaoId: number | null;
  nomeArquivoOrigem: string | null;
  quantidadeLancamentos: number;
  valorTotal: number;
  situacao: string;
}
