/** CategoriaDTO da API (JSON em camelCase). */
export type CategoriaDto = {
  id: number;
  nome: string;
  subcategoria: string;
  naturezaOperacao: number;
  ativo: boolean;
};

/** Envio para CreateCategory/UpdateCategory (id só na atualização). */
export type CategoriaCreateUpdateDto = {
  id?: number;
  nome: string;
  subcategoria: string;
  naturezaOperacao?: number | null;
  ativo?: boolean | null;
};
