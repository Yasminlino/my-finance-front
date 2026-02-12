import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';

import { TipoMovimentacaoListComponent } from './tipo-movimentacao-list/tipo-movimentacao-list.component';
import { TipoMovimentacaoFormComponent } from './tipo-movimentacao-form/tipo-movimentacao-form.component';
import { TipoMovimentacaoRoutingModule } from './tipo-movimentacao-routing.module';

@NgModule({
  declarations: [
    TipoMovimentacaoListComponent,
    TipoMovimentacaoFormComponent
  ],
  imports: [
    CommonModule,
    ReactiveFormsModule,
    TipoMovimentacaoRoutingModule
  ]
})
export class TipoMovimentacaoModule {}
