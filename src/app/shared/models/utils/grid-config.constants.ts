export interface ExibirCamposConfig {
  filter?: boolean;
  selected?: boolean;
  paginator?: boolean;
  sortable?: boolean;
  export?: boolean;
  filterMonth?: boolean;
  buttonDeleteAll?: boolean;
  buttonNew?: boolean;
  buttonLock?: boolean;
  buttonPopUp?: boolean;
  buttonViewLine?: boolean;
  buttonEditLine?: boolean;
  buttonDeleteLine?: boolean;
  buttonSaveCancel?: boolean;
}

export const EXIBIR_CAMPOS_CADASTRO: ExibirCamposConfig = {
  filter: true,
  sortable: true,
  selected: true,
  paginator: true,
  buttonDeleteAll: true,
  buttonNew: true,
  buttonEditLine: true,
  buttonDeleteLine: true
};

export const EXIBIR_CAMPOS_MOVIMENTACOES: ExibirCamposConfig = {
  filter: true,
  sortable: true,
  selected: true,
  paginator: true,
  filterMonth: true,
  buttonDeleteAll: true,
  buttonLock: true,
  buttonPopUp: true,
  buttonDeleteLine: true,
  buttonSaveCancel: true
};