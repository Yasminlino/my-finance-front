import { TagStatus } from "../../enums/status.enum";
import { GridColumnTypeEnum } from "./enum/grid-column.enum";

/**
 * Fonte única dos tipos de coluna é o GridColumnTypeEnum (FE-P1-07).
 * O tipo é a união dos valores do enum, então aceita tanto `GridColumnTypeEnum.Text` quanto `'text'`.
 */
export type GridColumnType = `${GridColumnTypeEnum}`;

/**
 * Campo de uma coluna: um campo da linha da tela, ou 'actions' (a coluna de botões). Com T, o compilador
 * recusa nome de campo errado — o modo de falha do [DB] P3 (card #26).
 */
export type GridCampo<T> = (keyof T & string) | 'actions';

export interface GridColumn<T> {
  field: GridCampo<T>;
  header: string;
  type?: GridColumnType;
  options?: GridColumnOption[];
  formatter?: (row: T) => unknown;
  icon?: string;
  functions?: string[];
  filterMatchMode?: string;
  width?: string;
  editable?: boolean;
  classe?: string | ((row: T) => string);
}

export enum TypeGrid {
  editaModal = 1,
  editaLinha = 2,
  visualizacao = 3
}

export interface GridColumnOption {
  label: string;
  value: unknown;
  classe?: TagStatus;
}

// Edita Modal:


/**
 * Valores de exibição de uma linha, calculados uma vez ao montar (ou ao editar) a linha, e não
 * a cada ciclo de detecção de mudanças (FE-P2-09). Ficam em `linha.__dg`.
 */
export interface GridLinhaMeta {
  /** O que a célula mostra: o formatter, o rótulo do select ou o próprio valor. */
  texto: Record<string, unknown>;
  /** Classe CSS de cada coluna (`col.classe`, que pode depender da linha). */
  classe: Record<string, string>;
  /** Severidade da tag de status. */
  severidade: TagStatus;
  /** Linha fora da seleção (somente leitura ou em `disabledRowIds`). */
  desabilitada: boolean;
  /** Linha que não entra na edição inline (predicado `bloquearLinha` da tela). */
  bloqueada: boolean;
}

/**
 * A linha como o grid a guarda: uma cópia da linha da tela, com as datas convertidas e os campos internos
 * (`__dg` e `__dg_<campo>` da busca global). Por dentro o grid lê e grava pelo nome da coluna; a tela recebe
 * a linha de volta como T.
 */
export interface LinhaGrid {
  [campo: string]: unknown;
  __dg?: GridLinhaMeta;
}

/** Alterações pendentes de uma linha editada inline. */
export interface GridRowChange<T> {
  /** Linha original (já atualizada com os novos valores). */
  row: T;
  /** Campos alterados: campo -> novo valor. */
  changes: Partial<T>;
}
