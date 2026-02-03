import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { ExtratoBancarioRoutingModule } from './extrato-bancario-routing.module';
import { ExtratoBancarioDetalhesComponent } from './extrato-bancario-detalhes/extrato-bancario-detalhes.component';
import { ExtratoBancarioResumoComponent } from './extrato-bancario-resumo/extrato-bancario-resumo.component';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

@NgModule({
  declarations: [
    ExtratoBancarioDetalhesComponent,
    ExtratoBancarioResumoComponent
  ],
  imports: [
    CommonModule,
    ExtratoBancarioRoutingModule,
    ReactiveFormsModule,
    FormsModule
  ]
})
export class ExtratoBancarioModule { }
