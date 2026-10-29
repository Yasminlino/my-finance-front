import { Routes } from '@angular/router';

/**
 * Endereços antigos (inglês e PascalCase) redirecionando para as rotas em português (FE-P2-12),
 * para favoritos e links já salvos continuarem funcionando. Parâmetros (:id) e query string
 * (mês, banco) são preservados pelo redirecionamento. Vêm antes das rotas lazy na ordem de
 * busca: 'extrato-bancario/ExtratoBancarioDetalhe' precisa casar antes de 'extrato-bancario'.
 */
export const ROTAS_ANTIGAS: Routes = [
  { path: 'category', redirectTo: 'categorias', pathMatch: 'full' },
  { path: 'account', redirectTo: 'contas', pathMatch: 'full' },
  { path: 'tipo-cartao', redirectTo: 'tipos-cartao', pathMatch: 'full' },
  { path: 'tipo-movimentacao', redirectTo: 'tipos-movimentacao', pathMatch: 'full' },
  { path: 'catalogos-listas', redirectTo: 'planejamento', pathMatch: 'full' },
  { path: 'catalogos-listas/:id/checagem', redirectTo: 'planejamento/:id/checagem', pathMatch: 'full' },
  { path: 'catalogos-listas/:id/cronograma', redirectTo: 'planejamento/:id/cronograma', pathMatch: 'full' },
  { path: 'catalogos-listas/:id/orcamento', redirectTo: 'planejamento/:id/orcamento', pathMatch: 'full' },
  // "Listas" virou "Planejamento" (card #63); /listas segue sendo o nome da API.
  { path: 'listas', redirectTo: 'planejamento', pathMatch: 'full' },
  { path: 'listas/:id/checagem', redirectTo: 'planejamento/:id/checagem', pathMatch: 'full' },
  { path: 'listas/:id/cronograma', redirectTo: 'planejamento/:id/cronograma', pathMatch: 'full' },
  { path: 'listas/:id/orcamento', redirectTo: 'planejamento/:id/orcamento', pathMatch: 'full' },
  { path: 'extrato-bancario/ExtratoBancarioDetalhe', redirectTo: 'extrato-bancario/detalhes', pathMatch: 'full' },
  { path: 'extrato-bancario/RelatorioGastosMensais', redirectTo: 'extrato-bancario/relatorio', pathMatch: 'full' },
];
