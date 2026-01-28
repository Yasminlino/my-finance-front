import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { CoreModule } from '../core/core.module';

import { LayoutComponent } from './layout/layout.component';

@NgModule({
  declarations: [LayoutComponent],
  imports: [CommonModule, RouterModule, CoreModule],
  exports: [LayoutComponent],
})
export class LayoutModule {}
