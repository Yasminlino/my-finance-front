import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';

import { CurrencyInputDirective } from './directives/currency-input.directive';
import { CalendarComponent } from '../core/components/calendar/calendar.component';

import { TableModule } from 'primeng/table';

@NgModule({
  declarations: [
    CalendarComponent
  ],
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    RouterModule,
    TableModule,
    CurrencyInputDirective
  ],
  exports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    RouterModule,
    CurrencyInputDirective,
    CalendarComponent,
    TableModule
  ]
})
export class SharedModule {}
