import { NgModule } from '@angular/core';

import { ListaRoutingModule } from './lista-routing.module';

/** As telas de Planejamento são standalone (cards #63 e #66); o módulo só carrega as rotas sob demanda. */
@NgModule({
  imports: [ListaRoutingModule]
})
export class ListaModule { }
