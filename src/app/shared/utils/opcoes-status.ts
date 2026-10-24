/** Opções de status para p-dropdown nos formulários de cadastro (FE-P2-07). */
export type OpcaoStatus<T> = { label: string; value: T };

/** Status gravado como booleano (Banco, Categoria, Conta, Lista). */
export const OPCOES_ATIVO: OpcaoStatus<boolean>[] = [
  { label: 'Ativo', value: true },
  { label: 'Inativo', value: false },
];
