import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { ExtratoMesComponent } from './extrato-mes/extrato-mes.component';
import { RelatorioGastosMensaisComponent } from './components/relatorio-gastos-mensais/relatorio-gastos-mensais.component';

const routes: Routes = [
  // Tela única do card #45; o antigo /detalhes?month=…&bancoId=… cai nela com os mesmos parâmetros.
  { path: '', component: ExtratoMesComponent },
  { path: 'detalhes', redirectTo: '', pathMatch: 'full' },
  { path: 'relatorio', component: RelatorioGastosMensaisComponent },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class ExtratoBancarioRoutingModule { }
