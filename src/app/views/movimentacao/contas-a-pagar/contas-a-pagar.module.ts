import { NgModule } from '@angular/core';

import { ContasAPagarRoutingModule } from './contas-a-pagar-routing.module';
import { ContasAPagarComponent } from './contas-a-pagar/contas-a-pagar.component';
import { ContasAPagarTotaisComponent } from './contas-a-pagar-totais/contas-a-pagar-totais.component';
import {  ModalAdicionarEmLoteComponent } from './components/modal-adicionar-em-lote/modal-adicionar-em-lote.component';
import { ModalNovaContasAPagarComponent } from './components/modal-nova-contas-a-pagar/modal-nova-contas-a-pagar.component';
import { SharedModule } from 'src/app/shared/shared.module';
import { DataGridComponent } from 'src/app/shared/components/data-grid/data-grid.component';
import { ToastModule } from 'primeng/toast';


@NgModule({
  declarations: [
    ContasAPagarComponent,
    ContasAPagarTotaisComponent,
    ModalAdicionarEmLoteComponent,
    ModalNovaContasAPagarComponent,    
  ],
  imports: [
    SharedModule,
    ContasAPagarRoutingModule,
    DataGridComponent,
    ToastModule
  ],
})
export class ContasAPagarModule { }
