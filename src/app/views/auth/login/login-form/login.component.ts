import { AfterViewInit, Component, ElementRef, OnInit } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { FormBuilder, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { finalize } from 'rxjs';
import { AcessoService } from 'src/app/core/services/acesso.service';
import { AuthService } from 'src/app/core/services/auth.service';
import { mensagemDoErro } from '../../shared/acesso.regras';

const MENSAGEM_RECUSA = 'Usuário/e-mail ou senha incorretos.';

/** Avisos de quem volta ao login vindo de outra tela (card #50), pelo ?motivo=. */
const AVISOS: Record<string, string> = {
  confirmado: 'E-mail confirmado. Entre para começar.',
  'senha-alterada': 'Senha alterada. Entre com a nova senha.',
};

/**
 * Para onde ir depois de entrar: só caminho interno do app. Fora disso (outro site, "//",
 * barra invertida, o próprio login), a home.
 */
export function destinoSeguro(url: string | null | undefined): string {
  const interno = !!url && url.startsWith('/') && !url.startsWith('//') && !url.includes('\\') && !url.startsWith('/login');
  return interno ? url : '/home';
}

/**
 * Login (card #70): erros por campo e recusa neutra na tela, aviso de sessão expirada,
 * volta para a página de onde a pessoa veio (returnUrl) e "Lembrar de mim" de verdade
 * (o AuthService decide onde a sessão fica; o usuário lembrado vem preenchido).
 * Card #50: senha certa com e-mail não confirmado (403) oferece reenviar o link; avisos de e-mail
 * confirmado e senha alterada. A moldura (painel da marca) e os estilos vêm de app-moldura-acesso.
 */
@Component({
  selector: 'app-login',
  templateUrl: './login.component.html'
})
export class LoginComponent implements OnInit, AfterViewInit {
  loading = false;
  /** Tentou enviar: os erros aparecem mesmo nos campos não tocados. */
  enviado = false;
  erroLogin = '';
  capsLock = false;
  sessaoExpirada = false;
  /** Aviso de quem voltou de outra tela de acesso (e-mail confirmado, senha alterada). */
  aviso = '';
  /** Senha certa, e-mail ainda não confirmado (403). */
  naoConfirmado = false;
  reenviando = false;
  reenviado = false;
  /** Usuário lembrado: o foco começa na senha. */
  focarSenha = false;
  private destino = '/home';

  readonly form = this.fb.nonNullable.group({
    username: ['', Validators.required],
    password: ['', Validators.required],
    remember: [false],
  });

  constructor(
    private fb: FormBuilder,
    private auth: AuthService,
    private router: Router,
    private route: ActivatedRoute,
    private acesso: AcessoService,
    private elemento?: ElementRef<HTMLElement>
  ) {}

  ngOnInit() {
    const query = this.route.snapshot.queryParamMap;
    this.destino = destinoSeguro(query.get('returnUrl'));
    this.sessaoExpirada = query.get('motivo') === 'expirada';
    this.aviso = AVISOS[query.get('motivo') ?? ''] ?? '';

    if (this.auth.tokenValido()) {
      this.router.navigateByUrl(this.destino, { replaceUrl: true });
      return;
    }

    const ultimo = this.auth.ultimoUsuario;
    if (ultimo) {
      this.form.patchValue({ username: ultimo, remember: true });
      this.focarSenha = true;
    }

    this.form.valueChanges.subscribe(() => {
      this.erroLogin = '';
      this.naoConfirmado = false;
    });
  }

  ngAfterViewInit() {
    const id = this.focarSenha ? 'password' : 'username';
    this.elemento?.nativeElement.querySelector<HTMLInputElement>(`#${id}`)?.focus();
  }

  /** Mensagem do campo, só depois de tocá-lo ou de tentar enviar. */
  erro(campo: 'username' | 'password'): string {
    const controle = this.form.controls[campo];
    if (!controle.invalid || !(controle.touched || this.enviado)) return '';
    return campo === 'username' ? 'Informe seu e-mail ou usuário.' : 'Informe sua senha.';
  }

  verificarCapsLock(evento: KeyboardEvent) {
    this.capsLock = evento.getModifierState?.('CapsLock') ?? false;
  }

  /** Reenvia o link de confirmação para o e-mail digitado (a API responde igual, tenha ou não conta). */
  reenviarConfirmacao() {
    this.reenviando = true;
    this.acesso.reenviarConfirmacao(this.form.controls.username.value.trim())
      .pipe(finalize(() => (this.reenviando = false)))
      .subscribe({
        next: () => (this.reenviado = true),
        error: (err: unknown) => (this.erroLogin = mensagemDoErro(err)),
      });
  }

  submit() {
    this.enviado = true;
    if (this.form.invalid) return;

    const { username, password, remember } = this.form.getRawValue();
    this.loading = true;
    this.erroLogin = '';
    this.naoConfirmado = false;
    this.reenviado = false;
    this.form.disable({ emitEvent: false });

    this.auth.autenticar(username.trim(), password, remember)
      .pipe(finalize(() => {
        this.loading = false;
        this.form.enable({ emitEvent: false });
      }))
      .subscribe({
        next: ok => {
          if (ok) {
            this.router.navigateByUrl(this.destino, { replaceUrl: true });
          } else {
            this.erroLogin = MENSAGEM_RECUSA;
          }
        },
        error: (err: unknown) => {
          // 401 é recusa (conta inexistente ou senha errada, a API não diz qual); 403, e-mail não confirmado;
          // outros 4xx trazem a mensagem da API (429: muitas tentativas); o resto, falha de conexão.
          const status = err instanceof HttpErrorResponse ? err.status : 0;
          if (status === 403) {
            this.naoConfirmado = true;
          } else {
            this.erroLogin = status === 401 ? MENSAGEM_RECUSA : mensagemDoErro(err);
          }
        }
      });
  }
}
