import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';

import { CurrencyInputDirective } from './directives/currency-input.directive';
import { CalendarComponent } from '../core/components/calendar/calendar.component';

import { TableModule } from 'primeng/table';
import { DialogModule } from 'primeng/dialog';
import { DropdownModule } from 'primeng/dropdown';
import { InputTextModule } from 'primeng/inputtext';
import { InputTextareaModule } from 'primeng/inputtextarea';
import { CheckboxModule } from 'primeng/checkbox';
import { ButtonModule } from 'primeng/button';

import { FieldErrorComponent } from './ui/field-error/field-error.component';
import { FormPanelComponent } from './ui/form-panel/form-panel.component';

/** Kit de formulário do PrimeNG para os componentes declarados em módulo (FE-P2-07). */
const KIT_PRIMENG = [DialogModule, DropdownModule, InputTextModule, InputTextareaModule, CheckboxModule, ButtonModule];
/** Painel e erro de campo da base de UI (card #27), para os formulários declarados em módulo. */
const KIT_FORMULARIO = [FormPanelComponent, FieldErrorComponent];

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
    CurrencyInputDirective,
    ...KIT_FORMULARIO
  ],
  exports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    RouterModule,
    CurrencyInputDirective,
    CalendarComponent,
    TableModule,
    ...KIT_PRIMENG,
    ...KIT_FORMULARIO
  ]
})
export class SharedModule {}
