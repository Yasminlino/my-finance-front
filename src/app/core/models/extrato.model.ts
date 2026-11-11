import { BancoDto } from './banco.model';
import { CategoriaDto } from './categoria.model';
import { PessoaMovimentacaoDto } from './pessoa-movimentacao.model';
import { TipoMovimentacaoDto } from './tipo-movimentacao.model';

/** Nota lida pelo QR Code (card #76, fase 6). */
export interface NotaFiscalDto {
  estabelecimento: string;
  total: number;
  link?: string | null;
  itens: { nome: string; quantidade: number; valor: number; categoriaId?: number | null; categoriaNome?: string | null }[];
}

/** Parte de um lançamento dividido (card #76, fase 3). Sem pessoa, é do dono. */
export interface ExtratoItemParteDto {
  id?: number;
  valor: number;
  categoriaId?: number | null;
  categoriaNome?: string | null;
  categoriaNaturezaOperacao?: number | null;
  tipoMovimentacaoId?: number | null;
  pessoaMovimentacaoId?: number | null;
  pessoaNome?: string | null;
  descricao?: string | null;
}

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

  /** Quem usou o cartão ("Carlos"), cadastrada à mão; a API liga só pelo id (card #79). */
  pessoaMovimentacaoId?: number | null;
  /** O nome que veio no extrato ("CIRCUITO"): classifica pelas regras e não é pessoa (card #79). */
  nomePessoaTransacao?: string | null;
  pessoaMovimentacao?: PessoaMovimentacaoDto | null;
  /** A categoria veio de uma regra com nome parecido (card #79). Só leitura. */
  classificadoPorSemelhanca?: boolean;

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
  /** Pede à API para gravar a pessoa de pessoaMovimentacaoId (sem id = sem pessoa). */
  alteraVinculoPessoa?: boolean;
  /** Pagamento (Entrada) que abate uma compra (Saída) da mesma pessoa; null = saldo geral (card #45, parte 3). */
  abateItemId?: number | null;
  /** Só leitura aqui: grava em /DividirExtratoBancarioItem. Vazio = não dividido. */
  partes?: ExtratoItemParteDto[];
  /** Tem nota fiscal salva (card #76, fase 6). */
  temNota?: boolean;
  /** Nomes dos itens da nota, para a busca. */
  itensNota?: string[];

  /** Navegações que a API devolve na leitura (o relatório de gastos agrupa por elas). */
  banco?: Pick<BancoDto, 'id' | 'nomeBanco'> | null;
  categoria?: Pick<CategoriaDto, 'id' | 'nome' | 'subcategoria'> & Partial<Pick<CategoriaDto, 'naturezaOperacao'>> | null;
  tipoMovimentacao?: Pick<TipoMovimentacaoDto, 'id' | 'nomeTipoMovimentacao'> | null;
}

/** ExtratoBancarioDTO da API: o cabeçalho de uma importação. */
/** Linha do histórico de importações (card #75). */
export interface ImportacaoDto {
  id: number;
  bancoId: number;
  bancoNome: string;
  nomeArquivo?: string | null;
  importadoEm: string;
  mesReferencia?: string | null;
  lancamentos: number;
  duplicados?: number | null;
  semCategoria: number;
  entradas: number;
  saidas: number;
  status: 'Concluida' | 'Pendencias' | 'Desfeita';
  desfeitoEm?: string | null;
  motivoDesfazer?: string | null;
}

export interface CoberturaCelulaDto {
  mes: string;
  estado: 'importado' | 'pendencias' | 'falta' | 'sem-dados' | string;
  lancamentos: number;
  pendencias: number;
}

export interface CoberturaImportacoesDto {
  meses: string[];
  contas: { bancoId: number; bancoNome: string; celulas: CoberturaCelulaDto[] }[];
}

export interface VinculosImportacaoDto {
  lancamentos: number;
  divididos: number;
  comNota: number;
  pagamentosAbatendo: number;
  pessoas: string[];
}

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

/** Uma linha do arquivo na prévia da importação (card #74). */
export interface LinhaPreviaImportacaoDto {
  chave: string;
  data: string;
  descricao: string;
  valor: number;
  tipoLancamento: string;
  categoriaId?: number | null;
  nomePessoa?: string | null;
  entraNosAcertos: boolean;
  duplicado: boolean;
}

/** O que a importação faria, sem gravar (card #74). */
export interface PreviaImportacaoDto {
  formato: string;
  ehFatura: boolean;
  /** null: a API não reconheceu o banco pelo arquivo; a tela pede. */
  bancoId?: number | null;
  bancoDetectado: boolean;
  mesReferencia?: string | null;
  dataInicio?: string | null;
  dataFim?: string | null;
  novos: number;
  duplicados: number;
  invalidas: number;
  entradas: number;
  saidas: number;
  mesJaImportado: boolean;
  aviso: string;
  linhas: LinhaPreviaImportacaoDto[];
}

/** Escolhas da prévia enviadas ao importar: chaves desmarcadas e categorias trocadas. */
export interface OpcoesImportacaoDto {
  pular: string[];
  categorias: Record<string, number | null>;
}

export interface ResultadoImportacaoDto {
  extratoId?: number;
  quantidadeCriados: number;
  quantidadeIgnorados: number;
  quantidadeJaImportados?: number;
  quantidadeDesmarcados?: number;
  valorTotal?: number;
  mensagem: string;
  mesDestino?: string | null;
}
