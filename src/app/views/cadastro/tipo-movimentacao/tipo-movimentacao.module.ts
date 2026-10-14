import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';

import { TipoMovimentacaoListComponent } from './tipo-movimentacao-list/tipo-movimentacao-list.component';
import { TipoMovimentacaoFormComponent } from './tipo-movimentacao-form/tipo-movimentacao-form.component';
import { TipoMovimentacaoRoutingModule } from './tipo-movimentacao-routing.module';
import { SharedModule } from 'src/app/shared/shared.module';
import { DataGridComponent } from 'src/app/shared/components/data-grid/data-grid.component';

@NgModule({
  declarations: [
    TipoMovimentacaoListComponent
  ],
  imports: [
    TipoMovimentacaoFormComponent,
    SharedModule,
    CommonModule,
    ReactiveFormsModule,
    DataGridComponent,
    TipoMovimentacaoRoutingModule
  ]
})
export class TipoMovimentacaoModule { }
