import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';

import { TipoMovimentacaoListComponent } from './tipo-movimentacao-list/tipo-movimentacao-list.component';
import { TipoMovimentacaoFormComponent } from './tipo-movimentacao-form/tipo-movimentacao-form.component';
import { TipoMovimentacaoRoutingModule } from './tipo-movimentacao-routing.module';
import { SharedModule } from 'primeng/api';
import { DataGridComponent } from 'src/app/shared/components/data-grid/data-grid.component';
import { ToastModule } from 'primeng/toast';
import { ChartsModule } from 'src/app/core/components/charts/charts.module';
import { NgbModule } from '@ng-bootstrap/ng-bootstrap';

@NgModule({
  declarations: [
    TipoMovimentacaoListComponent,
    TipoMovimentacaoFormComponent
  ],
  imports: [
    SharedModule,
    CommonModule,
    ReactiveFormsModule,
    DataGridComponent,
    ToastModule,
    ChartsModule,
    NgbModule,
    TipoMovimentacaoRoutingModule
  ]
})
export class TipoMovimentacaoModule { }
