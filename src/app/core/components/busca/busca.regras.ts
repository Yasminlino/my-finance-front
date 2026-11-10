import { ResultadoBuscaDto } from '../../services/busca.service';

/** Uma linha da busca rápida (card #72): tela, ação ou registro achado na API. */
export interface EntradaBusca {
  grupo: 'Ações' | 'Telas' | 'Planejamentos' | 'Itens de planejamento' | 'Categorias' | 'Contas fixas';
  titulo: string;
  detalhe?: string;
  icone: string;
  url: string;
}

/** Sempre disponíveis, sem chamar a API. */
export const ENTRADAS_FIXAS: EntradaBusca[] = [
  { grupo: 'Ações', titulo: 'Nova conta a pagar', icone: 'pi pi-plus', url: '/contas-a-pagar?novo=1' },
  { grupo: 'Ações', titulo: 'Novo lançamento no extrato', icone: 'pi pi-plus', url: '/extrato-bancario?lancar=1' },
  { grupo: 'Ações', titulo: 'Importar extrato', icone: 'pi pi-file-import', url: '/extrato-bancario/resumo?importar=1' },
  { grupo: 'Ações', titulo: 'Novo planejamento', icone: 'pi pi-plus', url: '/planejamento?novo=1' },
  { grupo: 'Telas', titulo: 'Início', icone: 'pi pi-home', url: '/home' },
  { grupo: 'Telas', titulo: 'Contas a pagar', icone: 'pi pi-money-bill', url: '/contas-a-pagar' },
  { grupo: 'Telas', titulo: 'Extratos', detalhe: 'Contas e cartões do mês', icone: 'pi pi-wallet', url: '/extrato-bancario/resumo' },
  { grupo: 'Telas', titulo: 'Relatório do mês', icone: 'pi pi-chart-line', url: '/extrato-bancario/relatorio' },
  { grupo: 'Telas', titulo: 'Meus planejamentos', icone: 'pi pi-clipboard', url: '/planejamento' },
  { grupo: 'Telas', titulo: 'Planejamentos arquivados', icone: 'pi pi-inbox', url: '/planejamento/arquivados' },
  { grupo: 'Telas', titulo: 'Contas fixas', detalhe: 'Cadastros', icone: 'pi pi-credit-card', url: '/contas' },
  { grupo: 'Telas', titulo: 'Categorias', detalhe: 'Cadastros', icone: 'pi pi-tags', url: '/categorias' },
  { grupo: 'Telas', titulo: 'Bancos', detalhe: 'Cadastros', icone: 'pi pi-building', url: '/bancos' },
  { grupo: 'Telas', titulo: 'Tipos de cartão', detalhe: 'Cadastros', icone: 'pi pi-id-card', url: '/tipos-cartao' },
  { grupo: 'Telas', titulo: 'Tipos de movimentação', detalhe: 'Cadastros', icone: 'pi pi-sync', url: '/tipos-movimentacao' }
];

/** Sem acento e em minúsculas, para "relatorio" achar "Relatório". */
export function normalizar(texto: string): string {
  return texto.normalize('NFD').replace(/[̀-ͯ]/g, '').toLocaleLowerCase('pt-BR').trim();
}

export function filtrarFixas(termo: string): EntradaBusca[] {
  const t = normalizar(termo);
  return t ? ENTRADAS_FIXAS.filter(e => normalizar(`${e.titulo} ${e.detalhe ?? ''}`).includes(t)) : ENTRADAS_FIXAS;
}

/** Cada tipo da API abre no lugar do registro. */
export function daApi(r: ResultadoBuscaDto): EntradaBusca | null {
  const detalhe = r.detalhe ?? undefined;
  switch (r.tipo) {
    case 'planejamento':
      return { grupo: 'Planejamentos', titulo: r.titulo, detalhe, icone: 'pi pi-clipboard', url: `/planejamento/${r.id}` };
    case 'item':
      return r.listaId ? { grupo: 'Itens de planejamento', titulo: r.titulo, detalhe, icone: 'pi pi-check-square', url: `/planejamento/${r.listaId}` } : null;
    case 'categoria':
      return { grupo: 'Categorias', titulo: r.titulo, detalhe, icone: 'pi pi-tag', url: `/categorias?editar=${r.id}` };
    case 'conta-fixa':
      return { grupo: 'Contas fixas', titulo: r.titulo, detalhe, icone: 'pi pi-credit-card', url: `/contas?editar=${r.id}` };
    default:
      return null;
  }
}
