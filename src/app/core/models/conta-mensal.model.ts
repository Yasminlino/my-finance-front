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

export type ContaMensal = {
  data: Date;
  nome: string;
  valor: number;
  contaId: number;
  situacao: string;
  categoriaId?: number | null;
  parcelaFormatada?: string;
}

/** Corpo de /CreateTransaction e /UpdateTransaction (TransacaoDTO da API). */
export type TransacaoPayload = {
  id?: number;
  data: Date | string;          // vai sempre como "YYYY-MM-DD" (ContaMensalService)
  nome: string;
  valor: number | string;       // a edição de Contas a Pagar guarda o valor do input
  contaId?: number | null;
  categoriaId?: number | null;
  situacao: string;
  ehParcelado?: boolean;
  parcelaAtual?: number | null;
  quantidadeParcelas?: number | null;
  observacao?: string | null;
  diasVencimento?: number[];    // só na criação: uma transação por dia
  /** Só na criação sem conta (card #47): false = lançamento avulso deste mês; ausente/true = cadastra a conta junto. */
  cadastrarConta?: boolean;
};
