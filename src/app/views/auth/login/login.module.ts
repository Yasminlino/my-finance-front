import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';

import { LoginRoutingModule } from './login-routing.module';
import { LoginComponent } from './login-form/login.component';
import { RegistroUsuarioComponent } from '../shared/components/registro-usuario/registro-usuario.component';

@NgModule({
  declarations: [
    LoginComponent,
    RegistroUsuarioComponent
  ],
  imports: [
    CommonModule,
    ReactiveFormsModule, // ✅ necessário pro [formGroup]
    LoginRoutingModule
  ]
})
export class LoginModule {}
