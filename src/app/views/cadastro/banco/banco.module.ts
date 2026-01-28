import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';

import { BancoRoutingModule } from './banco-routing.module';
import { BancoFormComponent } from './banco-form/banco-form.component';
import { BancoListComponent } from './banco-list/banco-list.component';
  
@NgModule({
  declarations: [
    BancoListComponent,
    BancoFormComponent
  ],
  imports: [
    CommonModule,
    ReactiveFormsModule,
    BancoRoutingModule
  ]
})
export class BancoModule {}
