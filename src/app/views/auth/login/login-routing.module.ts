import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { LoginComponent } from './login-form/login.component';
import { CadastroComponent } from './cadastro/cadastro.component';
import { ConfirmarEmailComponent } from './confirmar-email/confirmar-email.component';
import { RecuperarSenhaComponent } from './recuperar-senha/recuperar-senha.component';
import { RedefinirSenhaComponent } from './redefinir-senha/redefinir-senha.component';

// Telas de acesso (cards #70 e #50). confirmar-email e redefinir-senha são abertas pelos links dos e-mails.
const routes: Routes = [
  { path: '', component: LoginComponent },
  { path: 'cadastro', component: CadastroComponent },
  { path: 'confirmar-email', component: ConfirmarEmailComponent },
  { path: 'recuperar-senha', component: RecuperarSenhaComponent },
  { path: 'redefinir-senha', component: RedefinirSenhaComponent }
];


@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class LoginRoutingModule { }
