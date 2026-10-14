/** CategoryDTO da API (JSON em camelCase). */
export type CategoriaDto = {
  id: number;
  name: string;
  subCategory: string;
  naturezaOperacao: number;
  status: number;
};

/** Envio para CreateCategory/UpdateCategory (id só na atualização). */
export type CategoriaCreateUpdateDto = {
  id?: number;
  name: string;
  subCategory: string;
  naturezaOperacao?: number | null;
  status?: number | null;
};
