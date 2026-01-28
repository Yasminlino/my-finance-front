import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { ContaMensalListComponent } from './conta-mensal-list/conta-mensal-list.component';

const routes: Routes = [
  { path: '', component: ContaMensalListComponent } 
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class ContaMensalRoutingModule {}
