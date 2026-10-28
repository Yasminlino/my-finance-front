import { NgModule } from '@angular/core';
import { CalendarModule } from 'primeng/calendar';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { InputSwitchModule } from 'primeng/inputswitch';
import { MenuModule } from 'primeng/menu';
import { SplitButtonModule } from 'primeng/splitbutton';
import { ToastModule } from 'primeng/toast';
import { TooltipModule } from 'primeng/tooltip';

import { ContasAPagarRoutingModule } from './contas-a-pagar-routing.module';
import { ContasAPagarComponent } from './contas-a-pagar/contas-a-pagar.component';
import { ModalAdicionarEmLoteComponent } from './components/modal-adicionar-em-lote/modal-adicionar-em-lote.component';
import { ModalNovaContasAPagarComponent } from './components/modal-nova-contas-a-pagar/modal-nova-contas-a-pagar.component';
import { ResumoMesComponent } from './components/resumo-mes/resumo-mes.component';
import { BarraEdicaoComponent } from './components/barra-edicao/barra-edicao.component';
import { TabelaContasComponent } from './components/tabela-contas/tabela-contas.component';
import { ListaContasMovelComponent } from './components/lista-contas-movel/lista-contas-movel.component';
import { EditarContaSheetComponent } from './components/editar-conta-sheet/editar-conta-sheet.component';
import { SharedModule } from 'src/app/shared/shared.module';
import { PageHeaderComponent } from 'src/app/shared/ui/page-header/page-header.component';
import { FabComponent } from 'src/app/shared/ui/fab/fab.component';

@NgModule({
  declarations: [
    ContasAPagarComponent,
    ModalNovaContasAPagarComponent,
  ],
  imports: [
    SharedModule,
    ContasAPagarRoutingModule,
    CalendarModule,
    ConfirmDialogModule,
    InputSwitchModule,
    MenuModule,
    SplitButtonModule,
    ToastModule,
    TooltipModule,
    ModalAdicionarEmLoteComponent,
    ResumoMesComponent,
    BarraEdicaoComponent,
    TabelaContasComponent,
    ListaContasMovelComponent,
    EditarContaSheetComponent,
    PageHeaderComponent,
    FabComponent
  ]
})
export class ContasAPagarModule { }
