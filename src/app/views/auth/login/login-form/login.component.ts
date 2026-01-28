// src/app/views/auth/login/login.component.ts
import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from 'src/app/core/services/Auth.service';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss']
})
export class LoginComponent {
  showPwd = false;
  loading = false;
  showModalCreate = false;

  form: FormGroup;

  constructor(private fb: FormBuilder, private auth: AuthService, private router: Router) {
    this.form = this.fb.group({
      username: ['', [Validators.minLength(3)]],
      password: ['', [Validators.minLength(4)]],
      remember: [true],
    });
  }

  get errors() {
    const username = this.form.controls['username'].value ?? '';
    const password = this.form.controls['password'].value ?? '';
    return {
      username: username && username.length < 3 ? 'Informe seu e-mail ou usuário.' : '',
      password: password && password.length < 4 ? 'A senha deve ter pelo menos 4 caracteres.' : '',
    };
  }

  togglePwd() {
    this.showPwd = !this.showPwd;
  }

  openRegister() {
    this.showModalCreate = true;
  }

  closeRegister() {
    this.showModalCreate = false;
  }

  async submit() {
    const e = this.errors;
    if (e.username || e.password) {
      alert('Corrija os erros antes de continuar.');
      return;
    }

    try {
      this.loading = true;

      const username = this.form.controls['username'].value ?? '';
      const password = this.form.controls['password'].value ?? '';
      const remember = !!this.form.controls['remember'].value;

      const ok = await this.auth.authenticate(username, password, remember);

      if (ok) {
        await this.router.navigate(['/home'], { replaceUrl: true });
      } else {
        alert('Credenciais inválidas.');
      }
    } catch (err) {
      console.error('Erro ao autenticar:', err);
      alert('Não foi possível autenticar. Tente novamente.');
    } finally {
      this.loading = false;
    }
  }
}
