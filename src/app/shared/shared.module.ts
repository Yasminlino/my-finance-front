import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';

import { RegistroUsuarioComponent } from '../views/auth/shared/components/registro-usuario/registro-usuario.component';
import { HeaderComponent } from '../core/components/header/header/header.component';
import { CurrencyMaskDirective } from './directives/currency-mask.directives';
import { CurrencyInputDirective } from './directives/currency-input.directive';

@NgModule({
  declarations: [RegistroUsuarioComponent, CurrencyMaskDirective, CurrencyInputDirective],
  imports: [CommonModule],
  exports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    RouterModule,
    RegistroUsuarioComponent,
    HeaderComponent,
    CurrencyMaskDirective,
    CurrencyInputDirective
  ]
})
export class SharedModule {}
