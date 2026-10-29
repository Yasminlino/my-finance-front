import { ListaDto, ModeloLista } from 'src/app/core/models/lista.model';
import { CorCategoria, PALETA_CATEGORIA } from 'src/app/shared/ui/aparencia';

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

/** Ícone de quem não escolheu um (card #63). */
const ICONE_DO_MODELO: Record<ModeloLista, string> = {
  COMPRAS: 'pi pi-shopping-cart',
  ORCAMENTO: 'pi pi-wallet',
  TAREFAS: 'pi pi-check-square',
  AGENDA: 'pi pi-calendar',
  BRANCO: 'pi pi-clipboard'
};

const CORES = new Set<string>(PALETA_CATEGORIA.map(c => c.chave));
const MESES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
/** "Lista de compras · out/2026": o sufixo que o Duplicar troca pelo mês seguinte. */
const SUFIXO_DO_MES = /\s*·\s*([a-zç]{3})\/(\d{4})\s*$/i;
const TAMANHO_NOME = 120;

export type FiltroPlanejamento = 'TODOS' | 'VALOR' | 'DATA';
export type OrdemPlanejamento = 'RECENTES' | 'NOME';
/** Qual resumo o card mostra: o primeiro que valer, nesta ordem. */
export type TipoResumo = 'valor' | 'data' | 'progresso';

/** A tela interna única do planejamento (card #66), qualquer que sejam os campos. */
export function rotaDaLista(lista: Pick<ListaDto, 'id'>): string[] {
  return ['/planejamento', String(lista.id)];
}

/** Chips do card, na ordem do formulário; sem campo extra, "Só itens". */
export function chipsDosCampos(lista: CamposDaLista): string[] {
  const chips = [
    lista.usaQuantidade && 'Qtd',
    lista.usaValor && 'Valor',
    lista.usaValor && lista.usaLimite && 'Limite',
    lista.usaData && 'Data',
    lista.usaObservacao && 'Obs.'
  ].filter((c): c is string => !!c);
  return chips.length ? chips : ['Só itens'];
}

/** A cor escolhida; sem ela (ou fora da paleta), verde com Valor, roxo com Data, azul nos demais. */
export function corDaLista(lista: Pick<ListaDto, 'cor' | 'usaValor' | 'usaData'>): CorCategoria {
  if (lista.cor && CORES.has(lista.cor)) return lista.cor as CorCategoria;
  if (lista.usaValor) return 'verde';
  if (lista.usaData) return 'roxo';
  return 'azul';
}

export function iconeDaLista(lista: Pick<ListaDto, 'icone' | 'modelo'>): string {
  return lista.icone || ICONE_DO_MODELO[lista.modelo] || ICONE_DO_MODELO.BRANCO;
}

export function tipoDeResumo(lista: Pick<ListaDto, 'usaValor' | 'usaData'>): TipoResumo {
  if (lista.usaValor) return 'valor';
  if (lista.usaData) return 'data';
  return 'progresso';
}

export function percentualFeito(feitos: number, itens: number): number {
  return itens ? Math.round((feitos / itens) * 100) : 0;
}

/**
 * Nome sugerido no Duplicar: o "· mmm/aaaa" do fim vira o mês seguinte; sem ele, entra o mês seguinte ao
 * de hoje. Corta o nome (não o sufixo) para caber nos 120 caracteres da API.
 */
export function nomeDoMesSeguinte(nome: string, hoje: Date): string {
  let base = nome.trim();
  let ano = hoje.getFullYear();
  let mes = hoje.getMonth();

  const sufixo = SUFIXO_DO_MES.exec(base);
  const mesDoSufixo = sufixo ? MESES.indexOf(sufixo[1].toLowerCase()) : -1;
  if (sufixo && mesDoSufixo >= 0) {
    base = base.slice(0, sufixo.index).trim();
    ano = Number(sufixo[2]);
    mes = mesDoSufixo;
  }

  const seguinte = new Date(ano, mes + 1, 1);
  const novoSufixo = ` · ${MESES[seguinte.getMonth()]}/${seguinte.getFullYear()}`;
  return base.slice(0, TAMANHO_NOME - novoSufixo.length).trimEnd() + novoSufixo;
}

function normalizar(texto: string | null | undefined): string {
  return (texto ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
}

function passaNoFiltro(lista: ListaDto, filtro: FiltroPlanejamento): boolean {
  if (filtro === 'VALOR') return lista.usaValor;
  if (filtro === 'DATA') return lista.usaData;
  return true;
}

export function contarPorFiltro(listas: ListaDto[]): Record<FiltroPlanejamento, number> {
  return {
    TODOS: listas.length,
    VALOR: listas.filter(l => l.usaValor).length,
    DATA: listas.filter(l => l.usaData).length
  };
}

export function filtrarPlanejamentos(listas: ListaDto[], filtro: FiltroPlanejamento, busca: string): ListaDto[] {
  const termo = normalizar(busca);
  return listas.filter(l => passaNoFiltro(l, filtro) && (!termo || normalizar(l.nome).includes(termo)));
}

export function ordenarPlanejamentos(listas: ListaDto[], ordem: OrdemPlanejamento): ListaDto[] {
  return [...listas].sort((a, b) =>
    ordem === 'NOME' ? normalizar(a.nome).localeCompare(normalizar(b.nome), 'pt-BR') : b.id - a.id);
}
