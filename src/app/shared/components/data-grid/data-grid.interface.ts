import { TagStatus } from "../../enums/status.enum";

export type GridColumnType =
  | 'text'
  | 'text-area'
  | 'select'
  | 'multiselect'
  | 'number'
  | 'money'
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
  width?: string;
  editable?: boolean;
}

export enum TypeGrid {
  editaModal = 1,
  editaLinha = 2,
  visualizacao = 3 
}

export interface ExibirCampos {
  filter?: boolean;
  selected?: boolean;
  paginator?: boolean;
  sortable?: boolean;
  export?: boolean;
  filterMonth?: boolean;
  buttonDeleteAll: boolean;
  buttonNew: boolean;
  buttonLock: boolean;
  buttonPopUp: boolean;
  buttonEditLine: boolean;
  buttonDeleteLine: boolean;
  buttonSaveCancel: boolean;
}

export interface GridColumnOption {
  label: string;
  value: any;
  classe?: TagStatus;
}

// Edita Modal:


/** Alterações pendentes de uma linha editada inline. */
export interface GridRowChange {
  /** Linha original (já atualizada com os novos valores). */
  row: any;
  /** Campos alterados: campo -> novo valor. */
  changes: Record<string, any>;
}
