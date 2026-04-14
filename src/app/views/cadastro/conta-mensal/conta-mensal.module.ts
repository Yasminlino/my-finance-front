import { NgModule } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';

import { ContaMensalRoutingModule } from './conta-mensal-routing.module';
import { ContaMensalFormComponent } from './conta-mensal-form/conta-mensal-form.component';
import { ContaMensalListComponent } from './conta-mensal-list/conta-mensal-list.component';

import { SharedModule } from 'src/app/shared/shared.module';
import { ChartsModule } from 'src/app/core/components/charts/charts.module';
import { NgbModule } from '@ng-bootstrap/ng-bootstrap';

@NgModule({
  declarations: [
    ContaMensalListComponent,
    ContaMensalFormComponent,
  ],
  imports: [
    SharedModule,
    ReactiveFormsModule,
    ContaMensalRoutingModule,
    ChartsModule,
    NgbModule
  ]
})
export class CadastroContaMensalModule { }
  