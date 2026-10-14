import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MenubarModule } from 'primeng/menubar';
import { ButtonModule } from 'primeng/button';
import { SharedModule as PrimeSharedModule } from 'primeng/api';

import { HeaderComponent } from 'src/app/core/components/header/header/header.component';

@NgModule({
  declarations: [
    HeaderComponent
  ],
  imports: [
    CommonModule,
    RouterModule,
    MenubarModule,
    ButtonModule,
    PrimeSharedModule
  ],
  exports: [
    HeaderComponent
  ]
})
export class CoreModule {}
