import { Component, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { ButtonModule } from 'primeng/button';
import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';
import { InputTextModule } from 'primeng/inputtext';
import { MessageModule } from 'primeng/message';
import { PasswordModule } from 'primeng/password';
import { AcessoService } from 'src/app/core/services/acesso.service';
import { HttpErrorResponse } from '@angular/common/http';
import {
  MENSAGEM_USUARIO_INVALIDO, emailValido, mensagemDoErro, senhaForte, senhasIguais, usuarioValido
} from '../../shared/acesso.regras';
import { ContagemReenvio } from '../../shared/contagem-reenvio';
import { MolduraAcessoComponent } from '../../shared/components/moldura-acesso/moldura-acesso.component';
import { RequisitosSenhaComponent } from '../../shared/components/requisitos-senha/requisitos-senha.component';

type Campo = 'nome' | 'usuario' | 'email' | 'senha' | 'confirmar';

/**
 * Criar conta (card #50): nome, nome de usuário (card #84), e-mail e senha. Depois de enviar, a tela vira
 * "Verifique seu e-mail", com reenvio liberado a cada 60s. A resposta é a mesma tenha ou não conta com o
 * e-mail (a API avisa o dono); nome de usuário já em uso volta como 409 e aparece embaixo do campo.
 */
@Component({
  selector: 'app-cadastro',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink, ButtonModule, IconFieldModule, InputIconModule, InputTextModule,
    MessageModule, PasswordModule, MolduraAcessoComponent, RequisitosSenhaComponent],
  templateUrl: './cadastro.component.html'
})
export class CadastroComponent implements OnDestroy {
  etapa: 'formulario' | 'enviado' = 'formulario';
  enviando = false;
  tentouEnviar = false;
  erroApi = '';
  /** "Já está em uso", vindo da API; some quando a pessoa muda o nome de usuário. */
  usuarioEmUso = '';
  emailEnviado = '';
  reenviado = false;
  readonly contagem = new ContagemReenvio();

  readonly form = this.fb.nonNullable.group({
    nome: ['', [Validators.required, Validators.maxLength(120)]],
    usuario: ['', [Validators.required, usuarioValido]],
    email: ['', [Validators.required, emailValido]],
    senha: ['', [Validators.required, senhaForte]],
    confirmar: ['', Validators.required],
  }, { validators: senhasIguais });

  constructor(private fb: FormBuilder, private acesso: AcessoService) {
    this.form.valueChanges.subscribe(() => (this.erroApi = ''));
    this.form.controls.usuario.valueChanges.subscribe(() => (this.usuarioEmUso = ''));
  }

  ngOnDestroy() {
    this.contagem.parar();
  }

  /** Mensagem do campo, só depois de tocá-lo ou de tentar enviar. */
  erro(campo: Campo): string {
    const controle = this.form.controls[campo];
    if (!(controle.touched || this.tentouEnviar)) return '';
    const e = controle.errors;
    switch (campo) {
      case 'nome': return e ? 'Informe seu nome.' : '';
      case 'usuario': return e?.['required'] ? 'Escolha um nome de usuário.' : e ? MENSAGEM_USUARIO_INVALIDO : this.usuarioEmUso;
      case 'email': return e?.['required'] ? 'Informe seu e-mail.' : e ? 'Informe um e-mail válido.' : '';
      case 'senha': return e?.['required'] ? 'Crie uma senha.' : e ? 'A senha precisa ter pelo menos 8 caracteres, com letras e números.' : '';
      case 'confirmar':
        return e?.['required'] ? 'Repita a senha.' : this.form.errors?.['senhasDiferentes'] ? 'As senhas não são iguais.' : '';
    }
  }

  enviar() {
    this.tentouEnviar = true;
    if (this.form.invalid) return;

    const { nome, usuario, email, senha } = this.form.getRawValue();
    this.enviando = true;
    this.acesso.cadastrar(nome.trim(), usuario.trim(), email.trim(), senha)
      .pipe(finalize(() => (this.enviando = false)))
      .subscribe({
        next: () => {
          this.emailEnviado = email.trim();
          this.etapa = 'enviado';
          this.contagem.iniciar();
        },
        error: (err: unknown) => {
          // 409 é o nome de usuário já em uso: a mensagem vai para o campo, não para o topo.
          if (err instanceof HttpErrorResponse && err.status === 409) {
            this.usuarioEmUso = mensagemDoErro(err);
          } else {
            this.erroApi = mensagemDoErro(err);
          }
        },
      });
  }

  reenviar() {
    this.erroApi = '';
    this.acesso.reenviarConfirmacao(this.emailEnviado).subscribe({
      next: () => {
        this.reenviado = true;
        this.contagem.iniciar();
      },
      error: (err: unknown) => (this.erroApi = mensagemDoErro(err)),
    });
  }
}
