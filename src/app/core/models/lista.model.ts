import { Time } from '@angular/common';

/** ListaDTO da API. `tipoMovimentacao` é o TipoLista (1 Checklist, 2 Cronograma, 3 Orçamento). */
export type ListaDto = {
  id: number;
  nome: string;
  tipoMovimentacao: number;
  status: boolean;
};

/** ItemListaDTO da API (JSON em camelCase). */
export type ItemListaDto = {
  id: number;
  listaId?: number;
  descricao?: string;
  quantidade?: number;
  /** PENDENTE | AGUARDANDO | OK (CHECK do banco). */
  status?: string;
  valor?: number;
  observacao?: string;
  dataTarefa?: Date;
  horarioTarefa?: Time;
};
