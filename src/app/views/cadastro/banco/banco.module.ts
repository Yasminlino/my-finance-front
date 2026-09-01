import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';

import { BancoRoutingModule } from './banco-routing.module';
import { BancoFormComponent } from './banco-form/banco-form.component';
import { BancoListComponent } from './banco-list/banco-list.component';
import { ToastModule } from 'primeng/toast';
import { SharedModule } from 'src/app/shared/shared.module';
import { DataGridComponent } from 'src/app/shared/components/data-grid/data-grid.component';
import { ChartsModule } from 'src/app/core/components/charts/charts.module';
import { NgbModule } from '@ng-bootstrap/ng-bootstrap';

@NgModule({
  declarations: [
    BancoListComponent,
    BancoFormComponent
  ],
  imports: [
    SharedModule,
    CommonModule,
    ReactiveFormsModule,
    DataGridComponent,
    ToastModule,
    BancoRoutingModule,
    ChartsModule,
    NgbModule
  ]
})
export class BancoModule { }
