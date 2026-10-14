import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';

import { TipoCartaoRoutingModule } from './tipo-cartao-routing.module';
import { TipoCartaoListComponent } from './tipo-cartao-list/tipo-cartao-list.component';
import { TipoCartaoFormComponent } from './tipo-cartao-form/tipo-cartao-form.component';
import { SharedModule } from 'src/app/shared/shared.module';
import { DataGridComponent } from 'src/app/shared/components/data-grid/data-grid.component';
import { NgbModule } from '@ng-bootstrap/ng-bootstrap';

@NgModule({
  declarations: [TipoCartaoListComponent],
  imports: [
    TipoCartaoFormComponent,
    SharedModule,
    CommonModule,
    ReactiveFormsModule,
    DataGridComponent,
    NgbModule,
    TipoCartaoRoutingModule
  ],
})
export class TipoCartaoModule { }
