import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { ExtratoBancarioRoutingModule } from './extrato-bancario-routing.module';
import { ExtratoBancarioListComponent } from './extrato-bancario-list/extrato-bancario-list.component';
import { ExtratoBancarioFormComponent } from './extrato-bancario-form/extrato-bancario-form.component';


@NgModule({
  declarations: [
    ExtratoBancarioListComponent,
    ExtratoBancarioFormComponent
  ],
  imports: [
    CommonModule,
    ExtratoBancarioRoutingModule
  ]
})
export class ExtratoBancarioModule { }
