import { Component, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { ButtonModule } from 'primeng/button';
import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';
import { InputTextModule } from 'primeng/inputtext';
import { MessageModule } from 'primeng/message';
import { AcessoService } from 'src/app/core/services/acesso.service';
import { mensagemDoErro, emailValido } from '../../shared/acesso.regras';
import { ContagemReenvio } from '../../shared/contagem-reenvio';
import { MolduraAcessoComponent } from '../../shared/components/moldura-acesso/moldura-acesso.component';

/**
 * "Esqueci a senha" (card #50): pede o e-mail e mostra uma mensagem neutra (a API não diz se ele tem
 * conta). O link vale 30 minutos; reenvio liberado a cada 60s.
 */
@Component({
  selector: 'app-recuperar-senha',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink, ButtonModule, IconFieldModule, InputIconModule, InputTextModule,
    MessageModule, MolduraAcessoComponent],
  templateUrl: './recuperar-senha.component.html'
})
export class RecuperarSenhaComponent implements OnDestroy {
  etapa: 'formulario' | 'enviado' = 'formulario';
  enviando = false;
  tentouEnviar = false;
  erroApi = '';
  reenviado = false;
  readonly email = new FormControl('', { nonNullable: true, validators: [Validators.required, emailValido] });
  readonly contagem = new ContagemReenvio();

  constructor(private acesso: AcessoService) {
    this.email.valueChanges.subscribe(() => (this.erroApi = ''));
  }

  ngOnDestroy() {
    this.contagem.parar();
  }

  get erroEmail(): string {
    if (!(this.email.touched || this.tentouEnviar) || this.email.valid) return '';
    return this.email.hasError('required') ? 'Informe seu e-mail.' : 'Informe um e-mail válido.';
  }

  enviar() {
    this.tentouEnviar = true;
    if (this.email.invalid) return;

    this.enviando = true;
    this.acesso.esqueciSenha(this.email.value.trim())
      .pipe(finalize(() => (this.enviando = false)))
      .subscribe({
        next: () => {
          if (this.etapa === 'enviado') this.reenviado = true;
          this.etapa = 'enviado';
          this.contagem.iniciar();
        },
        error: (err: unknown) => (this.erroApi = mensagemDoErro(err)),
      });
  }
}
