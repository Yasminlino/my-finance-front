import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { ContaMensalEstruturaComponent } from './conta-mensal-estrutura/conta-mensal-estrutura.component';

const routes: Routes = [
  { path: '', component: ContaMensalEstruturaComponent }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class ContaMensalRoutingModule { }
