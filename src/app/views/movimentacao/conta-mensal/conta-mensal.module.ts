import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { ContaMensalRoutingModule } from './conta-mensal-routing.module';
import { ContaMensalListComponent } from './conta-mensal-list/conta-mensal-list.component';
import { ContaMensalHeaderComponent } from './conta-mensal-header/conta-mensal-header.component';
import { ContaMensalFiltrosComponent } from './conta-mensal-filtros/conta-mensal-filtros.component';
import { ContaMensalTotaisComponent } from './conta-mensal-totais/conta-mensal-totais.component';
import { ContaMensalEstruturaComponent } from './conta-mensal-estrutura/conta-mensal-estrutura.component';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import {  ModalAdicionarEmLoteComponent } from './components/modal-adicionar-em-lote/modal-adicionar-em-lote.component';


@NgModule({
  declarations: [
    ContaMensalListComponent,
    ContaMensalHeaderComponent,
    ContaMensalFiltrosComponent,
    ContaMensalTotaisComponent,
    ContaMensalEstruturaComponent,
    ModalAdicionarEmLoteComponent
  ],
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    ContaMensalRoutingModule
  ]
})
export class ContaMensalModule { }
