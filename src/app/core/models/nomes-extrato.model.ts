/** Card #79 — "Nomes do extrato": como cada nome que veio no extrato ("CIRCUITO") está classificado. */
export type CoberturaNome = 'igual' | 'outra' | 'semelhanca' | 'nenhuma';

/** NomeExtratoDTO da API. */
export type NomeExtratoDto = {
  texto: string;
  lancamentos: number;
  /** "YYYY-MM-DD". */
  ultimoUso: string;
  semCategoria: number;
  cobertura: CoberturaNome;
  /** A regra que classifica (ou a parecida, na semelhança). */
  regraId: number | null;
  regraTexto: string | null;
  categoriaId: number | null;
  tipoMovimentacaoId: number | null;
  /** Pelo histórico desse nome (ou pela regra parecida); só quando não há regra. */
  sugestaoCategoriaId: number | null;
  sugestaoTipoMovimentacaoId: number | null;
};

export type ClassificarNomeDto = { texto: string; categoriaId: number | null; tipoMovimentacaoId: number | null };

export type ClassificacaoNomesResultadoDto = { regras: number; lancamentos: number };

export type RegraParecidaDto = { id: number; texto: string; categoriaId: number | null; tipoMovimentacaoId: number | null; lancamentos: number };

export type GrupoParecidosDto = { regras: RegraParecidaDto[]; divergem: boolean };
