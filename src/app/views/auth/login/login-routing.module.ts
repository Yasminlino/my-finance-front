import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { LoginComponent } from './login-form/login.component';
import { RecuperarSenhaComponent } from './recuperar-senha/recuperar-senha.component';

const routes: Routes = [
  { path: '', component: LoginComponent },
  { path: 'recuperar-senha', component: RecuperarSenhaComponent }
];


@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class LoginRoutingModule { }
