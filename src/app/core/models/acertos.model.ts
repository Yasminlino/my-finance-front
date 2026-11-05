/** GET /GetAcertos (card #45, parte 3): quem me deve, por pessoa. JSON em camelCase da API. */
export type AcertosDto = {
  pessoas: AcertoPessoaDto[];
  /** Minhas compras ("Eu"), à parte: nunca somam nos totais. */
  eu: AcertoPessoaDto | null;
  totais: TotaisAcertosDto;
};

export type TotaisAcertosDto = {
  devido: number;
  recebido: number;
  faltaReceber: number;
  aindaVaiCobrar: number;
};

export type AcertoPessoaDto = {
  pessoaId: number;
  nome: string;
  ehTitular: boolean;
  devido: number;
  recebido: number;
  falta: number;
  quitado: boolean;
  aindaVaiCobrar: number;
  compras: AcertoCompraDto[];
  pagamentos: AcertoPagamentoDto[];
  proximasParcelas: AcertoParcelaFuturaDto[];
};

export type AcertoCompraDto = {
  id: number;
  data: string;
  descricao: string | null;
  valor: number;
  bancoId: number | null;
  bancoNome: string | null;
  parcelaAtual: number | null;
  quantidadeParcelas: number | null;
  /** Soma dos pagamentos que abatem esta compra (de qualquer data). */
  pago: number;
  quitada: boolean;
};

export type AcertoPagamentoDto = {
  id: number;
  data: string;
  descricao: string | null;
  valor: number;
  bancoId: number | null;
  bancoNome: string | null;
  /** Compra abatida; null = saldo geral. */
  abateItemId: number | null;
};

export type AcertoParcelaFuturaDto = {
  /** "YYYY-MM". */
  mes: string;
  descricao: string | null;
  valor: number;
  parcela: number;
  quantidadeParcelas: number;
};

/** Filtros da aba Acertos: período em "YYYY-MM" (null = sem limite) e conta ou cartão. */
export type FiltroAcertos = { inicio: string | null; fim: string | null; bancoId: number | null };
