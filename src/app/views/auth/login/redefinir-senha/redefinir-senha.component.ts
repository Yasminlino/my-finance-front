import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { ButtonModule } from 'primeng/button';
import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';
import { MessageModule } from 'primeng/message';
import { PasswordModule } from 'primeng/password';
import { AcessoService } from 'src/app/core/services/acesso.service';
import { ehLinkInvalido, mensagemDoErro, senhaForte, senhasIguais } from '../../shared/acesso.regras';
import { MolduraAcessoComponent } from '../../shared/components/moldura-acesso/moldura-acesso.component';
import { RequisitosSenhaComponent } from '../../shared/components/requisitos-senha/requisitos-senha.component';

/**
 * Link do e-mail de "Esqueci a senha" (card #50): senha nova com os requisitos ao vivo e confirmação.
 * Deu certo, vai ao login com o aviso; link vencido ou usado leva a pedir outro.
 */
@Component({
  selector: 'app-redefinir-senha',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink, ButtonModule, IconFieldModule, InputIconModule, MessageModule,
    PasswordModule, MolduraAcessoComponent, RequisitosSenhaComponent],
  templateUrl: './redefinir-senha.component.html'
})
export class RedefinirSenhaComponent implements OnInit {
  linkInvalido = false;
  enviando = false;
  tentouEnviar = false;
  erroApi = '';
  private token = '';

  readonly form = this.fb.nonNullable.group({
    senha: ['', [Validators.required, senhaForte]],
    confirmar: ['', Validators.required],
  }, { validators: senhasIguais });

  constructor(private fb: FormBuilder, private acesso: AcessoService, private route: ActivatedRoute, private router: Router) {
    this.form.valueChanges.subscribe(() => (this.erroApi = ''));
  }

  ngOnInit() {
    this.token = this.route.snapshot.queryParamMap.get('token') ?? '';
    this.linkInvalido = !this.token;
  }

  erro(campo: 'senha' | 'confirmar'): string {
    const controle = this.form.controls[campo];
    if (!(controle.touched || this.tentouEnviar)) return '';
    const e = controle.errors;
    if (campo === 'senha')
      return e?.['required'] ? 'Crie uma senha.' : e ? 'A senha precisa ter pelo menos 8 caracteres, com letras e números.' : '';
    return e?.['required'] ? 'Repita a senha.' : this.form.errors?.['senhasDiferentes'] ? 'As senhas não são iguais.' : '';
  }

  enviar() {
    this.tentouEnviar = true;
    if (this.form.invalid) return;

    this.enviando = true;
    this.acesso.redefinirSenha(this.token, this.form.controls.senha.value)
      .pipe(finalize(() => (this.enviando = false)))
      .subscribe({
        next: () => this.router.navigate(['/login'], { queryParams: { motivo: 'senha-alterada' }, replaceUrl: true }),
        error: (err: unknown) => {
          if (ehLinkInvalido(err)) {
            this.linkInvalido = true;
          } else {
            this.erroApi = mensagemDoErro(err);
          }
        },
      });
  }
}
