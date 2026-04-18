import { NgModule } from '@angular/core';

import { ListaRoutingModule } from './lista-routing.module';
import { ListaDeChecagemComponent } from './steps/lista-de-checagem/lista-de-checagem.component';
import { ListaDeCronogramaComponent } from './steps/lista-de-cronograma/lista-de-cronograma.component';
import { ListaDeOrcamentoComponent } from './steps/lista-de-orcamento/lista-de-orcamento.component';
import { ModalNovaListaComponent } from './components/modal-nova-lista/modal-nova-lista.component';
import { ListaRootComponent } from './lista-root/lista-root.component';
import { ModalNovoItemListaComponent } from './components/modal-novo-item-lista/modal-novo-item-lista.component';
import { ConfigStatusColorsComponent } from './components/config-status-colors/config-status-colors.component';
import { SharedModule } from 'src/app/shared/shared.module';
import { ModalItemChecagemComponent } from './components/modal-item-checagem/modal-item-checagem.component';

@NgModule({
  declarations: [
    ListaRootComponent,
    ModalNovaListaComponent,
    ListaDeChecagemComponent,
    // ListaDeCronogramaComponent,
    ListaDeOrcamentoComponent,
    ModalNovoItemListaComponent,
    ConfigStatusColorsComponent, ModalItemChecagemComponent,
  ],
  imports: [
    SharedModule,
    ListaRoutingModule,    
    
  ]
})
export class ListaModule { }
