import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';

import { TipoCartaoRoutingModule } from './tipo-cartao-routing.module';
import { TipoCartaoListComponent } from './tipo-cartao-list/tipo-cartao-list.component';
import { TipoCartaoFormComponent } from './tipo-cartao-form/tipo-cartao-form.component';

@NgModule({
  declarations: [TipoCartaoListComponent, TipoCartaoFormComponent],
  imports: [CommonModule, ReactiveFormsModule, TipoCartaoRoutingModule],
})
export class TipoCartaoModule {}
