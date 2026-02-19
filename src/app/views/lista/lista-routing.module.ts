import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { ListaRootComponent } from './lista-root/lista-root.component';
import { ListaDeChecagemComponent } from './steps/lista-de-checagem/lista-de-checagem.component';
import { ListaDeCronogramaComponent } from './steps/lista-de-cronograma/lista-de-cronograma.component';
import { ListaDeOrcamentoComponent } from './steps/lista-de-orcamento/lista-de-orcamento.component';

const routes: Routes = [{
  path: '', component: ListaRootComponent},
  { path: ':id/checagem', component: ListaDeChecagemComponent },
  { path: ':id/cronograma', component: ListaDeCronogramaComponent },
  { path: ':id/orcamento', component: ListaDeOrcamentoComponent },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class ListaRoutingModule { }
