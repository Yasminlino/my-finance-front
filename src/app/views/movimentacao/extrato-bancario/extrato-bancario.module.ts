import { NgModule } from '@angular/core';

import { ExtratoBancarioRoutingModule } from './extrato-bancario-routing.module';
import { ExtratoBancarioDetalhesComponent } from './extrato-bancario-detalhes/extrato-bancario-detalhes.component';
import { ExtratoBancarioResumoComponent } from './extrato-bancario-resumo/extrato-bancario-resumo.component';
import { MoneyMaskBrDirective } from 'src/app/shared/directives/money-mask.directive';
import { ModalConfiguracaoVinculoPessoaComponent } from './components/modal-configuracao-vinculo-pessoa/modal-configuracao-vinculo-pessoa.component';
import { SharedModule } from 'src/app/shared/shared.module';
import { ModalImportacoesMensaisComponent } from './components/modal-importacoes-mensais/modal-importacoes-mensais.component';
import { RelatorioGastosMensaisComponent } from './components/relatorio-gastos-mensais/relatorio-gastos-mensais.component';

@NgModule({
  declarations: [
    ExtratoBancarioDetalhesComponent,
    ExtratoBancarioResumoComponent,
    MoneyMaskBrDirective,
    ModalConfiguracaoVinculoPessoaComponent,
    ModalImportacoesMensaisComponent,
    RelatorioGastosMensaisComponent
  ],
  imports: [
    SharedModule,
    ExtratoBancarioRoutingModule,
  ]
})
export class ExtratoBancarioModule { }
