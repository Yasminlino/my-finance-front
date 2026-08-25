import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { ContasAPagarComponent } from './contas-a-pagar/contas-a-pagar.component';

const routes: Routes = [
  { path: '', component: ContasAPagarComponent }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class ContasAPagarRoutingModule { }
