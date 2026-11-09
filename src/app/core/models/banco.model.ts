import { TipoCartaoDto } from './tipo-cartao.model';

/** BancoDTO da API (JSON em camelCase). */
export type BancoDto = {
  id: number;
  nomeBanco: string;
  agencia?: string | null;
  numeroConta?: string | null;
  saldoInicial: number;
  ativo: boolean;
  /** Dia do vencimento da fatura (cartão de crédito). */
  diaVencimento?: number | null;
  tipoCartaoId?: number | null;
  tipoCartao?: Pick<TipoCartaoDto, 'id' | 'nomeTipoCartao'> | null;
};

export type BancoCreateUpdateDto = {
  id: number;
  nomeBanco: string;
  saldoInicial: number;
  diaVencimento?: number | null;
  tipoCartaoId?: number | null;
  ativo: boolean;
};
