import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';

import { ContaMensalRoutingModule } from './conta-mensal-routing.module';
import { ContaMensalFormComponent } from './conta-mensal-form/conta-mensal-form.component';
import { ContaMensalListComponent } from './conta-mensal-list/conta-mensal-list.component';

import { CurrencyMaskDirective } from 'src/app/shared/directives/currency-mask.directives';
import { CurrencyInputDirective } from 'src/app/shared/directives/currency-input.directive';

@NgModule({
  declarations: [
    ContaMensalListComponent,
    ContaMensalFormComponent,
    CurrencyMaskDirective,
    CurrencyInputDirective
  ],
  imports: [
    CommonModule,
    ReactiveFormsModule,
    ContaMensalRoutingModule
  ]
})
export class ContaMensalModule { }
