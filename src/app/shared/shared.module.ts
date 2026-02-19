import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';

import { CurrencyMaskDirective } from './directives/currency-mask.directives';
import { CurrencyInputDirective } from './directives/currency-input.directive';

@NgModule({
  declarations: [
    CurrencyMaskDirective,
    CurrencyInputDirective
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
    CurrencyInputDirective
  ]
})
export class SharedModule {}

