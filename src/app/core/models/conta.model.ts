/**
 * AccountDTO da API (JSON em camelCase). Até o BE-P3-09 a categoria vinha como `categoryid`
 * (AccountDTO.Categoryid); agora é `categoryId`, como no TransactionDTO.
 */
export type ContaDto = {
  id: number;
  name: string;
  value: number;
  dataOperacao?: number[]; // usado no envio
  categoryId: number;
  categoryName?: string | null;
  status: number;
  ehParcelado: boolean;
  parcelaAtual: number;
  quantidadeParcelas: number;

  contaVencimentos?: ContaVencimentoDto[];
};

export type ContaVencimentoDto = {
  id: number;
  contaId: number;
  dia: number;
  diasVencimentoString: string;
};
