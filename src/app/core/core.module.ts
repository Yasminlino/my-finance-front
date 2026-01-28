import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

import { HeaderComponent } from 'src/app/core/components/header/header/header.component';

@NgModule({
  declarations: [
    HeaderComponent
  ],
  imports: [
    CommonModule,
    RouterModule // ✅ necessário se o header usa routerLink/routerLinkActive
  ],
  exports: [
    HeaderComponent // ✅ exporta pra outros módulos enxergarem
  ]
})
export class CoreModule {}
