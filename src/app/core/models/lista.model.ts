/** Como o valor do item soma no total: UNITARIO = quantidade × valor; TOTAL = o valor já é o total do item. */
export type ModoValorLista = 'UNITARIO' | 'TOTAL';

/** Repetição de um item com data (agenda, card #67 parte 3). */
export type RepeticaoItem = 'NENHUMA' | 'DIARIA' | 'SEMANAL' | 'MENSAL';

/** Modelo escolhido ao criar a lista; só pré-marca os campos (card #67). */
export type ModeloLista = 'COMPRAS' | 'ORCAMENTO' | 'TAREFAS' | 'AGENDA' | 'BRANCO';

/** Números do card da lista no Cadastro, calculados pela API. Item sem valor fica fora do total. */
export type ResumoListaDto = {
  itens: number;
  feitos: number;
  total: number;
  totalFeito: number;
  /** yyyy-mm-dd: menor data de hoje em diante entre os pendentes. */
  proximaData?: string | null;
};

/** ListaDTO da API: a lista liga os campos que os itens usam (card #67). */
export type ListaDto = {
  id: number;
  nome: string;
  /** "pi pi-<nome>" */
  icone?: string | null;
  /** Chave da paleta (shared/ui/aparencia.ts); null = derivada dos campos (corDaLista, card #63). */
  cor?: string | null;
  usaQuantidade: boolean;
  usaValor: boolean;
  modoValor: ModoValorLista;
  /** Só com usaValor. */
  usaLimite: boolean;
  limite?: number | null;
  usaData: boolean;
  usaObservacao: boolean;
  modelo: ModeloLista;
  /** Listas da mesma série se comparam; muda só por duplicar e por ligar/sair da série. */
  serieId?: string;
  listaOrigemId?: number | null;
  /** Preenchida = lista na pasta Arquivadas. Só muda por arquivar/desarquivar. */
  arquivadaEm?: string | null;
  /** Vem na listagem e no GET por id; a API ignora na gravação. */
  resumo?: ResumoListaDto | null;
};

/** ItemListaDTO da API (JSON em camelCase). Os campos opcionais aparecem conforme a lista. */
export type ItemListaDto = {
  id: number;
  listaId?: number;
  descricao?: string;
  feito?: boolean;
  /** Gravado pela API ao marcar como feito. */
  feitoEm?: string | null;
  quantidade?: number | null;
  valor?: number | null;
  /** yyyy-mm-dd */
  data?: string | null;
  /** HH:mm:ss; sem hora = dia todo. */
  hora?: string | null;
  repeticao?: RepeticaoItem;
  /** 1 = segunda … 7 = domingo; só na semanal. */
  diasSemana?: number[] | null;
  /** yyyy-mm-dd; null = sem fim. */
  repetirAte?: string | null;
  observacao?: string | null;
  ordem?: number | null;
  /** Item de onde este foi copiado ao duplicar. */
  itemOrigemId?: number | null;
};

/** Resposta das ações em lote dos itens. */
export type ResultadoLoteDto = { afetados: number };

/** Opções do POST /listas/{id}/duplicar. A cópia fica sempre na série da original. */
export type DuplicarListaDto = {
  nome?: string | null;
  copiarItens?: boolean;
  manterValores?: boolean;
  arquivarOriginal?: boolean;
};

/** Uma lista na comparação. */
export type ListaComparadaDto = { id: number; nome: string; total: number };

/** Lado de um item na comparação; total null = item sem valor. */
export type LadoItemComparadoDto = { quantidade?: number | null; valor?: number | null; total?: number | null };

export type MudancaItem = 'NOVO' | 'SAIU' | 'PRECO_SUBIU' | 'PRECO_CAIU' | 'QUANTIDADE';

export type ItemComparadoDto = {
  descricao: string;
  anterior?: LadoItemComparadoDto | null;
  atual?: LadoItemComparadoDto | null;
  diferenca: number;
  percentual?: number | null;
  mudancas: MudancaItem[];
};

export type DestaqueComparacaoDto = { descricao: string; diferenca: number; percentual?: number | null };

/** GET /listas/{id}/comparar: preco + quantidade + novos − sairam = atual.total − anterior.total. */
export type ComparacaoListasDto = {
  anterior: ListaComparadaDto;
  atual: ListaComparadaDto;
  diferenca: number;
  percentual?: number | null;
  efeitos: { preco: number; quantidade: number; novos: number; sairam: number };
  itens: ItemComparadoDto[];
  destaques: {
    maiorAltaPreco?: DestaqueComparacaoDto | null;
    maiorImpacto?: DestaqueComparacaoDto | null;
    maiorQueda?: DestaqueComparacaoDto | null;
  };
  semValor: string[];
};

/** Uma ocorrência na agenda (GET /listas/{id}/itens?de=&ate=): data e hora já com a mudança de "só esta". */
export type OcorrenciaDto = {
  itemId: number;
  /** yyyy-mm-dd: identifica a ocorrência nas alterações. */
  dataOriginal: string;
  data: string;
  /** Null = dia todo. */
  hora?: string | null;
  feito: boolean;
  feitoEm?: string | null;
  repete: boolean;
  descricao: string;
  observacao?: string | null;
  quantidade?: number | null;
  valor?: number | null;
};

/** "Só esta": campo ausente = não muda; data igual à original desfaz a mudança de dia. */
export type AlterarOcorrenciaDto = {
  feito?: boolean;
  data?: string;
  hora?: string;
  /** true = exclui só esta ocorrência. */
  pulada?: boolean;
};
