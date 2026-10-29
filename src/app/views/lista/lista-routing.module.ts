import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { PlanejamentoComponent } from './planejamento/planejamento.component';
import { PlanejamentosComponent } from './planejamentos/planejamentos.component';

/**
 * /planejamento (cards #63 e #66): Meus planejamentos e a pasta Arquivados são a mesma tela, em modos diferentes;
 * /planejamento/:id é a tela interna única. As telas por tipo (orçamento, checagem, cronograma) redirecionam para ela.
 */
const routes: Routes = [
  { path: '', component: PlanejamentosComponent },
  { path: 'arquivados', component: PlanejamentosComponent, data: { arquivados: true } },
  { path: ':id', component: PlanejamentoComponent },
  { path: ':id/checagem', redirectTo: ':id', pathMatch: 'full' },
  { path: ':id/cronograma', redirectTo: ':id', pathMatch: 'full' },
  { path: ':id/orcamento', redirectTo: ':id', pathMatch: 'full' },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class ListaRoutingModule { }
