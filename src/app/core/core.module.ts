import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { BadgeModule } from 'primeng/badge';
import { ButtonModule } from 'primeng/button';
import { MenuModule } from 'primeng/menu';
import { OverlayPanelModule } from 'primeng/overlaypanel';
import { SidebarModule } from 'primeng/sidebar';
import { BuscaComponent } from 'src/app/core/components/busca/busca.component';
import { PainelAvisosComponent } from 'src/app/core/components/notificacoes/painel-avisos.component';
import { ModalComponent, ModalMaisDirective } from 'src/app/shared/ui/modal/modal.component';
import { SharedModule as PrimeSharedModule } from 'primeng/api';

import { HeaderComponent } from 'src/app/core/components/header/header/header.component';

@NgModule({
  declarations: [
    HeaderComponent
  ],
  imports: [
    CommonModule,
    RouterModule,
    BadgeModule,
    ButtonModule,
    MenuModule,
    OverlayPanelModule,
    SidebarModule,
    BuscaComponent,
    PainelAvisosComponent,
    ModalComponent,
    ModalMaisDirective,
    PrimeSharedModule
  ],
  exports: [
    HeaderComponent
  ]
})
export class CoreModule {}
