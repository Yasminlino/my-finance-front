import { AfterViewInit, Component, ElementRef, OnInit } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { FormBuilder, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { finalize } from 'rxjs';
import { AuthService } from 'src/app/core/services/auth.service';

const MENSAGEM_RECUSA = 'Usuário/e-mail ou senha incorretos.';
const MENSAGEM_CONEXAO = 'Não foi possível conectar. Tente novamente em instantes.';

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
 */
@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss']
})
export class LoginComponent implements OnInit, AfterViewInit {
  loading = false;
  showModalCreate = false;
  /** Tentou enviar: os erros aparecem mesmo nos campos não tocados. */
  enviado = false;
  erroLogin = '';
  capsLock = false;
  sessaoExpirada = false;
  /** Usuário lembrado: o foco começa na senha. */
  focarSenha = false;
  readonly ano = new Date().getFullYear();
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
    private elemento?: ElementRef<HTMLElement>
  ) {}

  ngOnInit() {
    const query = this.route.snapshot.queryParamMap;
    this.destino = destinoSeguro(query.get('returnUrl'));
    this.sessaoExpirada = query.get('motivo') === 'expirada';

    if (this.auth.tokenValido()) {
      this.router.navigateByUrl(this.destino, { replaceUrl: true });
      return;
    }

    const ultimo = this.auth.ultimoUsuario;
    if (ultimo) {
      this.form.patchValue({ username: ultimo, remember: true });
      this.focarSenha = true;
    }

    this.form.valueChanges.subscribe(() => (this.erroLogin = ''));
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

  openRegister() {
    this.showModalCreate = true;
  }

  closeRegister() {
    this.showModalCreate = false;
  }

  submit() {
    this.enviado = true;
    if (this.form.invalid) return;

    const { username, password, remember } = this.form.getRawValue();
    this.loading = true;
    this.erroLogin = '';
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
          // 401 é recusa (conta inexistente ou senha errada, a API não diz qual); o resto, falha de conexão.
          const recusa = err instanceof HttpErrorResponse && err.status === 401;
          this.erroLogin = recusa ? MENSAGEM_RECUSA : MENSAGEM_CONEXAO;
        }
      });
  }
}
