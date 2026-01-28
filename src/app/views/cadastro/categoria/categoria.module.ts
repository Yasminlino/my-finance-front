import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';

import { CategoriaRoutingModule } from './categoria-routing.module';
import { CategoriaListComponent } from './categoria-list/categoria-list.component';
import { CategoriaFormComponent } from './categoria-form/categoria-form.component';

@NgModule({
  declarations: [
    CategoriaListComponent,
    CategoriaFormComponent
  ],
  imports: [
    CommonModule,
    ReactiveFormsModule,
    CategoriaRoutingModule
  ]
})
export class CategoriaModule {}
