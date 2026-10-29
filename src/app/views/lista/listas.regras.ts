import { ListaDto, ModeloLista } from 'src/app/core/models/lista.model';

type CamposDaLista = Pick<ListaDto, 'usaQuantidade' | 'usaValor' | 'modoValor' | 'usaLimite' | 'usaData' | 'usaObservacao'>;

/**
 * Campos que cada modelo pré-marca ao criar a lista (card #67). O modelo não muda regra nenhuma
 * depois: a lista vale pelos campos ligados.
 */
export const CAMPOS_DO_MODELO: Record<ModeloLista, CamposDaLista> = {
  COMPRAS: { usaQuantidade: true, usaValor: true, modoValor: 'UNITARIO', usaLimite: false, usaData: false, usaObservacao: false },
  ORCAMENTO: { usaQuantidade: false, usaValor: true, modoValor: 'TOTAL', usaLimite: true, usaData: false, usaObservacao: true },
  TAREFAS: { usaQuantidade: false, usaValor: false, modoValor: 'TOTAL', usaLimite: false, usaData: false, usaObservacao: false },
  AGENDA: { usaQuantidade: false, usaValor: false, modoValor: 'TOTAL', usaLimite: false, usaData: true, usaObservacao: false },
  BRANCO: { usaQuantidade: false, usaValor: false, modoValor: 'TOTAL', usaLimite: false, usaData: false, usaObservacao: false }
};

/**
 * Tela de hoje que abre a lista, até a tela única do card #66: com Valor, a de orçamento;
 * com Data, a de cronograma; o resto, a de checagem.
 */
export function rotaDaLista(lista: Pick<ListaDto, 'id' | 'usaValor' | 'usaData'>): string[] {
  if (lista.usaValor) return ['/listas', String(lista.id), 'orcamento'];
  if (lista.usaData) return ['/listas', String(lista.id), 'cronograma'];
  return ['/listas', String(lista.id), 'checagem'];
}
