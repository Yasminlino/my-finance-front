import { NgModule } from '@angular/core';

import { ExtratoBancarioRoutingModule } from './extrato-bancario-routing.module';
import { ExtratoBancarioDetalhesComponent } from './extrato-bancario-detalhes/extrato-bancario-detalhes.component';
import { ExtratoBancarioResumoComponent } from './extrato-bancario-resumo/extrato-bancario-resumo.component';
import { ModalConfiguracaoVinculoPessoaComponent } from './components/modal-configuracao-vinculo-pessoa/modal-configuracao-vinculo-pessoa.component';
import { SharedModule } from 'src/app/shared/shared.module';
import { ModalImportacoesMensaisComponent } from './components/modal-importacoes-mensais/modal-importacoes-mensais.component';
import { RelatorioGastosMensaisComponent } from './components/relatorio-gastos-mensais/relatorio-gastos-mensais.component';
import { ChartsModule } from 'src/app/core/components/charts/charts.module';
import { NgbModule } from '@ng-bootstrap/ng-bootstrap';
import { CommonModule } from '@angular/common';
import { DataGridComponent } from 'src/app/shared/components/data-grid/data-grid.component';
import { ContasAPagarModule } from '../contas-a-pagar/contas-a-pagar.module';

@NgModule({
  declarations: [
    ExtratoBancarioDetalhesComponent,
    ExtratoBancarioResumoComponent,
    ModalConfiguracaoVinculoPessoaComponent,
    ModalImportacoesMensaisComponent,
    RelatorioGastosMensaisComponent
  ],
  imports: [
    SharedModule,
    ExtratoBancarioRoutingModule,
    ChartsModule,
    NgbModule,
    DataGridComponent,
    ContasAPagarModule
  ]
})
export class ExtratoBancarioModule { }
