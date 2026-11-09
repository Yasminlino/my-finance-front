/** Resumo do mês por categoria (card #76, fase 5). */
export type ResumoCategoriaLinhaDto = {
  categoriaId: number | null;
  nome: string;
  valor: number;
  percentual: number;
  media?: number | null;
  variacao?: number | null;
};

export type ResumoCategoriasDto = {
  mes: string;
  total: number;
  mediaAnterior?: number | null;
  variacaoTotal?: number | null;
  mesesComparados: number;
  deOutrasPessoas: number;
  foraDoResumo: number;
  categorias: ResumoCategoriaLinhaDto[];
};

export interface EvolucaoExtratosMesDto {
  mes: string;
  entradas: number;
  saidas: number;
  resultado: number;
}

export interface EvolucaoExtratosDto {
  meses: EvolucaoExtratosMesDto[];
}
