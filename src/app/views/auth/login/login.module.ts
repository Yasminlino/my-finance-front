import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';
import { InputTextModule } from 'primeng/inputtext';
import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';
import { PasswordModule } from 'primeng/password';
import { CheckboxModule } from 'primeng/checkbox';
import { ButtonModule } from 'primeng/button';
import { DividerModule } from 'primeng/divider';
import { MessageModule } from 'primeng/message';

import { LoginRoutingModule } from './login-routing.module';
import { LoginComponent } from './login-form/login.component';
import { MolduraAcessoComponent } from '../shared/components/moldura-acesso/moldura-acesso.component';

@NgModule({
  declarations: [
    LoginComponent
  ],
  imports: [
    CommonModule,
    ReactiveFormsModule,
    LoginRoutingModule,
    MolduraAcessoComponent,
    InputTextModule,
    IconFieldModule,
    InputIconModule,
    PasswordModule,
    CheckboxModule,
    ButtonModule,
    DividerModule,
    MessageModule
  ]
})
export class LoginModule {}
