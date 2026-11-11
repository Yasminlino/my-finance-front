import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { ButtonModule } from 'primeng/button';
import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';
import { InputTextModule } from 'primeng/inputtext';
import { MessageModule } from 'primeng/message';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { AcessoService } from 'src/app/core/services/acesso.service';
import { ehLinkInvalido, mensagemDoErro, emailValido } from '../../shared/acesso.regras';
import { MolduraAcessoComponent } from '../../shared/components/moldura-acesso/moldura-acesso.component';

/**
 * Link do e-mail de confirmação (card #50): confirma e leva ao login com o aviso. Link vencido ou já usado
 * pede o e-mail para mandar um novo.
 */
@Component({
  selector: 'app-confirmar-email',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink, ButtonModule, IconFieldModule, InputIconModule, InputTextModule,
    MessageModule, ProgressSpinnerModule, MolduraAcessoComponent],
  templateUrl: './confirmar-email.component.html'
})
export class ConfirmarEmailComponent implements OnInit {
  etapa: 'confirmando' | 'invalido' | 'reenviado' | 'erro' = 'confirmando';
  erroApi = '';
  enviando = false;
  tentouEnviar = false;
  readonly email = new FormControl('', { nonNullable: true, validators: [Validators.required, emailValido] });
  private token = '';

  constructor(private acesso: AcessoService, private route: ActivatedRoute, private router: Router) {}

  ngOnInit() {
    this.token = this.route.snapshot.queryParamMap.get('token') ?? '';
    this.confirmar();
  }

  confirmar() {
    if (!this.token) {
      this.etapa = 'invalido';
      return;
    }
    this.etapa = 'confirmando';
    this.acesso.confirmarEmail(this.token).subscribe({
      next: () => this.router.navigate(['/login'], { queryParams: { motivo: 'confirmado' }, replaceUrl: true }),
      error: (err: unknown) => {
        if (ehLinkInvalido(err)) {
          this.etapa = 'invalido';
        } else {
          this.erroApi = mensagemDoErro(err);
          this.etapa = 'erro';
        }
      },
    });
  }

  get erroEmail(): string {
    if (!(this.email.touched || this.tentouEnviar) || this.email.valid) return '';
    return this.email.hasError('required') ? 'Informe seu e-mail.' : 'Informe um e-mail válido.';
  }

  reenviar() {
    this.tentouEnviar = true;
    if (this.email.invalid) return;

    this.enviando = true;
    this.erroApi = '';
    this.acesso.reenviarConfirmacao(this.email.value.trim())
      .pipe(finalize(() => (this.enviando = false)))
      .subscribe({
        next: () => (this.etapa = 'reenviado'),
        error: (err: unknown) => (this.erroApi = mensagemDoErro(err)),
      });
  }
}
