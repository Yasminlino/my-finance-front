import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { TipoMovimentacaoListComponent } from './tipo-movimentacao-list/tipo-movimentacao-list.component';

const routes: Routes = [
  { path: '', component: TipoMovimentacaoListComponent }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class TipoMovimentacaoRoutingModule {}
