import { NgModule } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';

import { ContaMensalRoutingModule } from './conta-mensal-routing.module';
import { ContaMensalFormComponent } from './conta-mensal-form/conta-mensal-form.component';
import { ContaMensalListComponent } from './conta-mensal-list/conta-mensal-list.component';

import { CommonModule } from '@angular/common';
import { DataGridComponent } from 'src/app/shared/components/data-grid/data-grid.component';
import { SharedModule } from 'src/app/shared/shared.module';

@NgModule({
  declarations: [
    ContaMensalListComponent,
  ],
  imports: [
    ContaMensalFormComponent,
    SharedModule,
    CommonModule,
    ReactiveFormsModule,
    ContaMensalRoutingModule,
    DataGridComponent,
  ]
})
export class CadastroContaMensalModule { }
