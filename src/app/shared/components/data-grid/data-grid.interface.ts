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


/**
 * Valores de exibição de uma linha, calculados uma vez ao montar (ou ao editar) a linha, e não
 * a cada ciclo de detecção de mudanças (FE-P2-09). Ficam em `linha.__dg`.
 */
export interface GridLinhaMeta {
  /** O que a célula mostra: o formatter, o rótulo do select ou o próprio valor. */
  texto: Record<string, any>;
  /** Classe CSS de cada coluna (`col.classe`, que pode depender da linha). */
  classe: Record<string, string>;
  /** Severidade da tag de status. */
  severidade: TagStatus;
  /** Linha fora da seleção (somente leitura ou em `disabledRowIds`). */
  desabilitada: boolean;
  /** Linha que não entra na edição inline (predicado `bloquearLinha` da tela). */
  bloqueada: boolean;
}

/** Alterações pendentes de uma linha editada inline. */
export interface GridRowChange {
  /** Linha original (já atualizada com os novos valores). */
  row: any;
  /** Campos alterados: campo -> novo valor. */
  changes: Record<string, any>;
}
