import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';
import { InputTextModule } from 'primeng/inputtext';
import { InputGroupModule } from 'primeng/inputgroup';
import { CheckboxModule } from 'primeng/checkbox';
import { ButtonModule } from 'primeng/button';
import { DividerModule } from 'primeng/divider';

import { LoginRoutingModule } from './login-routing.module';
import { LoginComponent } from './login-form/login.component';
import { RegistroUsuarioComponent } from '../shared/components/registro-usuario/registro-usuario.component';

@NgModule({
  declarations: [
    LoginComponent
  ],
  imports: [
    CommonModule,
    ReactiveFormsModule,
    LoginRoutingModule,
    RegistroUsuarioComponent,
    InputTextModule,
    InputGroupModule,
    CheckboxModule,
    ButtonModule,
    DividerModule
  ]
})
export class LoginModule {}
