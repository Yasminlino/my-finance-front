import { NgModule } from '@angular/core';

import { ExtratoBancarioRoutingModule } from './extrato-bancario-routing.module';
import { ExtratoBancarioDetalhesComponent } from './extrato-bancario-detalhes/extrato-bancario-detalhes.component';
import { ModalConfiguracaoVinculoPessoaComponent } from './components/modal-configuracao-vinculo-pessoa/modal-configuracao-vinculo-pessoa.component';
import { SharedModule } from 'src/app/shared/shared.module';
import { ModalImportacoesMensaisComponent } from './components/modal-importacoes-mensais/modal-importacoes-mensais.component';
import { RelatorioGastosMensaisComponent } from './components/relatorio-gastos-mensais/relatorio-gastos-mensais.component';
import { ChartsModule } from 'src/app/core/components/charts/charts.module';
import { DataGridComponent } from 'src/app/shared/components/data-grid/data-grid.component';
import { ModalLancamentoManualComponent } from './components/modal-lancamento-manual/modal-lancamento-manual.component';
import { ModalImportarExtratoComponent } from './components/modal-importar-extrato/modal-importar-extrato.component';
import { ExtratoMesComponent } from './extrato-mes/extrato-mes.component';
import { StatCardComponent } from 'src/app/shared/ui/stat-card/stat-card.component';
import { TotaisSelecaoComponent } from 'src/app/shared/components/totais-selecao/totais-selecao.component';

@NgModule({
  declarations: [
    ExtratoBancarioDetalhesComponent,
    RelatorioGastosMensaisComponent
  ],
  imports: [
    SharedModule,
    ExtratoBancarioRoutingModule,
    ChartsModule,
    DataGridComponent,
    ModalLancamentoManualComponent,
    ModalImportarExtratoComponent,
    TotaisSelecaoComponent,
    StatCardComponent,
    ModalConfiguracaoVinculoPessoaComponent,
    ModalImportacoesMensaisComponent,
    ExtratoMesComponent
  ]
})
export class ExtratoBancarioModule { }
