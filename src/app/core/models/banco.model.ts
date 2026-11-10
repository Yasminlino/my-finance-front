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
  /** Dia do fechamento da fatura (card #77). */
  diaFechamento?: number | null;
  /** Outras pessoas usam este cartão (card #77). */
  compartilhado?: boolean;
  conviteCompartilharDispensado?: boolean;
  pessoasIds?: number[];
  tipoCartaoId?: number | null;
  tipoCartao?: Pick<TipoCartaoDto, 'id' | 'nomeTipoCartao'> | null;
};

export type BancoCreateUpdateDto = {
  id: number;
  nomeBanco: string;
  agencia?: string | null;
  numeroConta?: string | null;
  saldoInicial: number;
  diaVencimento?: number | null;
  diaFechamento?: number | null;
  compartilhado?: boolean;
  conviteCompartilharDispensado?: boolean;
  pessoasIds?: number[];
  tipoCartaoId?: number | null;
  ativo: boolean;
};
