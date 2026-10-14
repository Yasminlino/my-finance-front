/** TipoCartaoDTO da API (JSON em camelCase). */
export type TipoCartaoDto = {
  id: number;
  nomeTipoCartao: string;
  descricao?: string | null;
  /** Lançamentos agrupados por fatura, não por data (DB-P1-07). */
  ehCredito: boolean;
  /** Padrão do sistema (Cartão de crédito, Conta corrente, Conta Poupança): não edita nem exclui. */
  ehSistema: boolean;
};

export type TipoCartaoCreateUpdateDto = {
  id?: number;
  nomeTipoCartao: string;
  ehCredito: boolean;
};
