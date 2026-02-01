export type TipoMovimentacaoDto = {
  id: number;
  nomeTipoMovimentacao: string;
  descricao?: string | null;
  valorMeta?: number | null;
};
