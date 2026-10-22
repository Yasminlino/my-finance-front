export type LinhaContasMensais = {
  id: number;
  contaId: number;

  nome: string;
  valor: string | number;        // pode vir number do backend; no input usamos string formatada
  data: Date;                 // ideal: YYYY-MM-DD
  ehParcelado: boolean;
  parcelaAtual?: number;       // "1/3", "2/4", etc
  quantidadeParcelas?: number;  // "1/3", "2/4", etc
  observacao?: string;

  categoriaId: number;
  categoriaNome: string;
  tipoContaId: string;
  subcategoriaNome?: string;          // "Receita" | "Despesa"

  situacao: string;
  statusSalvo: string;
  desbloqueiaCampos: boolean;
};

export type LinhaContaMensal = {
  id: number;
  contaId: number;

  nome: string;
  valor: string | number;        // pode vir number do backend; no input usamos string formatada
  data: Date;                 // ideal: YYYY-MM-DD
  ehParcelado: boolean;
  parcelaAtual?: number;       // "1/3", "2/4", etc
  quantidadeParcelas?: number;  // "1/3", "2/4", etc
  observacao?: string;

  categoriaId: number;
  categoriaNome: string;
  tipoContaId: string;
  subcategoria?: string;          // "Receita" | "Despesa"

  situacao: string;
  statusSalvo: string;
  desbloqueiaCampos: boolean;
};

export type AgrupamentoContaMensal = {
  categoriaId: number;
  categoriaNome: string;
  subcategoria?: string;
  contas: Array<{
    id: number;
    transacoes: Array<{
      id: number;
      nome: string;
      valor: any;
      data: Date;   // YYYY-MM-DD
      situacao: string;
    }>;
  }>;
};

export type GrupoContaMensal = {
    id: number;
    nome: string;
    valor: number;
    contaId: number;
    categoriaId: number;
    data: string;   // ISO string vindo da API
    situacao: string;
    ehParcelado: boolean;
    parcelaAtual?: number;
    quantidadeParcelas?: number;
    observacao?: string;
    transacoes: Array<{
      id: number;
      nome: string;
      valor: number;
      data: string;   // ISO string vindo da API
      situacao: string;
      contaId?: number | null;
      categoriaId?: number | null;
    }>;
    conta: {
      id: number;
      nome: string;
      valor: number;
      categoriaId: number;
    }
};

export type ContaMensal = {
  data: Date;
  nome: string;
  valor: number;
  contaId: number;
  situacao: string;
  categoriaId?: any;
  parcelaFormatada?: string;
}

export type ContaVencendo = {
  data: Date;
  nome: string;
  valor: number;
  contaId: number;
  situacao: string;
}
