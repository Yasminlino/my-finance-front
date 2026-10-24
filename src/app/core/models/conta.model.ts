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

  vencimentos?: ContaVencimentoDto[];
};

export type ContaVencimentoDto = {
  id: number;
  contaId: number;
  dia: number;
  diasVencimentoString: string;
};
