
export type BancoDto = {
  id: number;
  nomeBanco: string;
  saldoInicial: number;
  ativo: boolean;
  tipoCartaoId?: number | null;
  tipoCartao?: {
    id: number,
    nomeTipoCartao: string,
  } | null;
};

export type ColumnFilters = {
  name: string[];         // ✅ agora é array
  tipoCartaoName: string[]; // ✅ agora é array    // continua texto
  value: string;          // continua texto
  status: string[];       // ✅ agora é array
};

export type BancoCreateUpdateDto = {
  id: number;
  nomeBanco: string;
  saldoInicial: number;
  tipoCartaoId?: number | null;
  ativo: boolean;
};