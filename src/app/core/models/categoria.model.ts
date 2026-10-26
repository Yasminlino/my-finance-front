/** CategoriaDTO da API (JSON em camelCase). */
export type CategoriaDto = {
  id: number;
  nome: string;
  subcategoria: string;
  naturezaOperacao: number;
  ativo: boolean;
  /** "pi pi-car"; nulo = o ícone pelo nome (card #23). */
  icone?: string | null;
  /** Chave de PALETA_CATEGORIA; nulo = a cor da natureza. */
  cor?: string | null;
  /** Só no GetCategories: quantas contas usam a categoria. */
  quantidadeContas?: number;
};

/** Envio para CreateCategory/UpdateCategory (id só na atualização). */
export type CategoriaCreateUpdateDto = {
  id?: number;
  nome: string;
  subcategoria: string;
  naturezaOperacao?: number | null;
  ativo?: boolean | null;
  icone?: string | null;
  cor?: string | null;
};
