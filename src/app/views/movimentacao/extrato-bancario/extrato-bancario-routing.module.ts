import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { ExtratoBancarioResumoComponent } from './extrato-bancario-resumo/extrato-bancario-resumo.component';
import { ExtratoBancarioDetalhesComponent } from './extrato-bancario-detalhes/extrato-bancario-detalhes.component';

const routes: Routes = [
  { path: '', component: ExtratoBancarioResumoComponent },
  { path: 'ExtratoBancarioDetalhe', component: ExtratoBancarioDetalhesComponent },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class ExtratoBancarioRoutingModule { }
