import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';

import { CurrencyMaskDirective } from './directives/currency-mask.directives';
import { CurrencyInputDirective } from './directives/currency-input.directive';
import { MoneyMaskBrDirective } from './directives/money-mask.directive';
import { CalendarComponent } from '../core/components/calendar/calendar.component';

@NgModule({
  declarations: [
    CurrencyMaskDirective,
    CurrencyInputDirective,
    MoneyMaskBrDirective,
    CalendarComponent
  ],
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    RouterModule
  ],
  exports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    RouterModule,
    CurrencyMaskDirective,
    CurrencyInputDirective,
    MoneyMaskBrDirective,
    CalendarComponent
  ]
})
export class SharedModule {}

