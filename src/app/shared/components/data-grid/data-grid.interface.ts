import { TagStatus } from "../../enums/status.enum";
import { GridColumnTypeEnum } from "./enum/grid-column.enum";

/**
 * Fonte única dos tipos de coluna é o GridColumnTypeEnum (FE-P1-07).
 * O tipo é a união dos valores do enum, então aceita tanto `GridColumnTypeEnum.Text` quanto `'text'`.
 */
export type GridColumnType = `${GridColumnTypeEnum}`;


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
  classe?: string | ((row: any) => string);
}

export enum TypeGrid {
  editaModal = 1,
  editaLinha = 2,
  visualizacao = 3 
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
