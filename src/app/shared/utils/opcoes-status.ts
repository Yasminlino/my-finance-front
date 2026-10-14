/** Opções de status para p-dropdown nos formulários de cadastro (FE-P2-07). */
export type OpcaoStatus<T> = { label: string; value: T };

/** Status gravado como booleano (Banco, Lista). */
export const OPCOES_ATIVO: OpcaoStatus<boolean>[] = [
  { label: 'Ativo', value: true },
  { label: 'Inativo', value: false },
];

/** Status gravado como número (Categoria, Conta): 1 = ativo, 0 = inativo. */
export const OPCOES_STATUS_NUMERICO: OpcaoStatus<number>[] = [
  { label: 'Ativo', value: 1 },
  { label: 'Inativo', value: 0 },
];
