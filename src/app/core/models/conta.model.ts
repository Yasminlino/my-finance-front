/**
 * AccountDTO da API (JSON em camelCase). `categoryid` com "i" minúsculo é o nome que a API
 * usa (AccountDTO.Categoryid); a resposta e o envio seguem esse nome.
 */
export type ContaDto = {
  id: number;
  name: string;
  value: number;
  dataOperacao?: number[]; // usado no envio
  categoryid: number;
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
