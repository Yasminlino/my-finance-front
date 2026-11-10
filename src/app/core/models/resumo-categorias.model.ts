/** Resumo do mês por categoria (card #76, fase 5). */
export type ResumoCategoriaLinhaDto = {
  categoriaId: number | null;
  nome: string;
  valor: number;
  percentual: number;
  media?: number | null;
  variacao?: number | null;
};

export type ResumoCategoriasDto = {
  mes: string;
  total: number;
  mediaAnterior?: number | null;
  variacaoTotal?: number | null;
  mesesComparados: number;
  deOutrasPessoas: number;
  foraDoResumo: number;
  categorias: ResumoCategoriaLinhaDto[];
};

export interface EvolucaoExtratosMesDto {
  mes: string;
  entradas: number;
  saidas: number;
  resultado: number;
}

export interface EvolucaoExtratosDto {
  meses: EvolucaoExtratosMesDto[];
}

/** Números de uma conta no mês (card #77): os mesmos no card da listagem e no topo do detalhe. */
export interface ResumoContaDto {
  bancoId: number;
  nome: string;
  tipoNome: string;
  ehCredito: boolean;
  ativo: boolean;
  agencia?: string | null;
  numeroConta?: string | null;
  compartilhado: boolean;
  conviteCompartilharDispensado: boolean;
  pessoas: string[];
  quantidade: number;
  entradas: number;
  saidas: number;
  resultado: number;
  semCategoria: number;
  fatura: number;
  pagamentosEstornos: number;
  parcelasQueContinuam: number;
  minhasCompras: number;
  deOutrasPessoas: number;
  porPessoa: { pessoaId: number; nome: string; valor: number }[];
  faltaReceber: number;
  importadoEm?: string | null;
  ultimaImportacao?: string | null;
  faltaImportar: boolean;
  dataFechamento?: string | null;
  dataVencimento?: string | null;
}

export interface ResumoContasDto {
  mes: string;
  entradas: number;
  saidas: number;
  paraClassificar: number;
  /** null quando nenhum cartão é compartilhado. */
  faltaReceber?: number | null;
  contas: ResumoContaDto[];
}
