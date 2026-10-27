/** ContaDTO da API (JSON em camelCase, em português desde o [DB] P3). */
export type ContaDto = {
  id: number;
  nome: string;
  valor: number;
  dataOperacao?: number[]; // usado no envio
  categoriaId: number;
  categoriaNome?: string | null;
  ativo: boolean;
  ehParcelado: boolean;
  parcelaAtual: number;
  quantidadeParcelas: number;
  /** Anotação livre (card #22); até 500 caracteres. */
  observacao?: string | null;
  /** Valor igual todo mês (card #47): no lançamento em lote chega como AGUARDANDO; sem isso, PENDENTE. */
  valorFixo?: boolean;

  vencimentos?: ContaVencimentoDto[];
};

/** Lançamento da conta em Contas a Pagar (TransacaoDTO de /GetTransacoesDaConta, card #22). */
export type LancamentoDaConta = {
  id: number;
  /** "YYYY-MM-DD" (DateOnly da API). */
  data: string;
  nome: string;
  valor: number;
  situacao: string;
  ehParcelado: boolean;
  parcelaAtual?: number | null;
  quantidadeParcelas?: number | null;
  observacao?: string | null;
};

export type ContaVencimentoDto = {
  id: number;
  contaId: number;
  dia: number;
  diasVencimentoString: string;
};
