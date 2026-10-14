import { NgModule } from '@angular/core';

import { ContasAPagarRoutingModule } from './contas-a-pagar-routing.module';
import { ContasAPagarComponent } from './contas-a-pagar/contas-a-pagar.component';
import { TotaisSelecaoComponent } from 'src/app/shared/components/totais-selecao/totais-selecao.component';
import {  ModalAdicionarEmLoteComponent } from './components/modal-adicionar-em-lote/modal-adicionar-em-lote.component';
import { ModalNovaContasAPagarComponent } from './components/modal-nova-contas-a-pagar/modal-nova-contas-a-pagar.component';
import { SharedModule } from 'src/app/shared/shared.module';
import { DataGridComponent } from 'src/app/shared/components/data-grid/data-grid.component';


@NgModule({
  declarations: [
    ContasAPagarComponent,
    ModalAdicionarEmLoteComponent,
    ModalNovaContasAPagarComponent,    
  ],
    imports: [
    SharedModule,
    ContasAPagarRoutingModule,
    DataGridComponent,
    TotaisSelecaoComponent
  ]
})
export class ContasAPagarModule { }
