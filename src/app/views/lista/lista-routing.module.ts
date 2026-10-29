import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { PlanejamentosComponent } from './planejamentos/planejamentos.component';
import { ListaDeChecagemComponent } from './steps/lista-de-checagem/lista-de-checagem.component';
import { ListaDeCronogramaComponent } from './steps/lista-de-cronograma/lista-de-cronograma.component';
import { ListaDeOrcamentoComponent } from './steps/lista-de-orcamento/lista-de-orcamento.component';

/** /planejamento (card #63): Meus planejamentos e a pasta Arquivados são a mesma tela, em modos diferentes. */
const routes: Routes = [
  { path: '', component: PlanejamentosComponent },
  { path: 'arquivados', component: PlanejamentosComponent, data: { arquivados: true } },
  { path: ':id/checagem', component: ListaDeChecagemComponent },
  { path: ':id/cronograma', component: ListaDeCronogramaComponent },
  { path: ':id/orcamento', component: ListaDeOrcamentoComponent },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class ListaRoutingModule { }
