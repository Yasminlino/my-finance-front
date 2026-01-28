import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { TipoCartaoListComponent } from './tipo-cartao-list/tipo-cartao-list.component';

const routes: Routes = [{ path: '', component: TipoCartaoListComponent }];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class TipoCartaoRoutingModule {}
