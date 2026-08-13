import { GridColumnOption } from "./data-grid.component";


export type GridColumnType =
  | 'text'
  | 'select'
  | 'multiselect'
  | 'number'
  | 'date'
  | 'boolean'
  | 'actions';

export interface GridColumn {
  field: string;
  header: string;
  type?: GridColumnType;
  options?: GridColumnOption[];
  formatter?: (row: any) => any;
  icon?: string;
  functions?: string[];
  filterMatchMode?: string;
  editable?: boolean;
}


/** Alterações pendentes de uma linha editada inline. */
export interface GridRowChange {
  /** Linha original (já atualizada com os novos valores). */
  row: any;
  /** Campos alterados: campo -> novo valor. */
  changes: Record<string, any>;
}
