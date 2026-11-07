/** Onde a regra procura o texto. */
export type CampoRegra = 'descricao_ou_pessoa' | 'descricao' | 'pessoa';
/** Como a regra compara o texto. */
export type OperadorRegra = 'contem' | 'comeca_com' | 'igual';

/**
 * RegraClassificacaoDTO da API (card #76, fase 1), lida como frase: "Se campo operador texto em conta, então categoria,
 * tipo e pessoa". Mais de uma bate: vale a de cima (ordem). Ordem, uso e última aplicação só se leem.
 */
export type RegraClassificacaoDto = {
  id: number;
  /** Normalizado pela API (sem acento, maiúsculas). */
  texto: string;
  campo?: CampoRegra;
  operador?: OperadorRegra;
  /** null = todas as contas. */
  bancoId?: number | null;
  bancoNome?: string | null;
  categoriaId: number | null;
  categoriaNome?: string | null;
  tipoMovimentacaoId?: number | null;
  tipoMovimentacaoNome?: string | null;
  pessoaMovimentacaoId?: number | null;
  pessoaNome?: string | null;
  ativa: boolean;
  ordem?: number;
  vezesAplicada?: number;
  /** ISO, UTC. */
  ultimaAplicacao?: string | null;
};

export type RegraClassificacaoCreateDto = Pick<RegraClassificacaoDto,
  'texto' | 'campo' | 'operador' | 'bancoId' | 'categoriaId' | 'tipoMovimentacaoId' | 'pessoaMovimentacaoId' | 'ativa'>;

/** Sugestão de categoria pelo histórico. */
export type SugestaoCategoriaDto = { itemId: number; categoriaId: number; vezes: number };

/** A frase de uma regra ainda não gravada, para a prévia ao vivo. */
export type PreviaRegraDto = {
  texto: string; campo?: CampoRegra; operador?: OperadorRegra; bancoId?: number | null; categoriaId?: number | null;
};

export type ExemploRegraDto = {
  id: number; dataMovimentacao: string; texto: string; valor: number; tipoLancamento?: string | null;
  categoriaId?: number | null; categoriaNome?: string | null;
};

/** O que a regra pegaria nos lançamentos que já existem. */
export type PreviaRegraResultadoDto = {
  total: number; semCategoria: number; conflitos: number; exemplos: ExemploRegraDto[]; exemplosConflito: ExemploRegraDto[];
};

/** Resultado do "aplicar": quantos e quais lançamentos ganharam categoria. */
export type AplicacaoRegraDto = { quantidade: number; itemIds: number[] };

/** Texto repetido em lançamentos sem categoria que ainda não tem regra ("Sugestões do seu extrato"). */
export type SugestaoRegraDto = {
  texto: string; quantidade: number; categoriaId?: number | null; categoriaNome?: string | null; vezesCategoria: number;
};
