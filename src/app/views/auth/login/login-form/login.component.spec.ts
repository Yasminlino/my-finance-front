import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormBuilder } from '@angular/forms';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { ActivatedRoute, Router, convertToParamMap, provideRouter } from '@angular/router';
import { Subject, of, throwError } from 'rxjs';

import { LoginComponent, destinoSeguro } from './login.component';
import { AuthService } from 'src/app/core/services/auth.service';
import { LoginModule } from '../login.module';

/**
 * Login (card #70): erros por campo e recusa neutra na própria tela (sem alert), aviso de sessão
 * expirada, volta para a página de onde a pessoa veio e "Lembrar de mim" de verdade.
 */
describe('LoginComponent', () => {
  let auth: jasmine.SpyObj<AuthService>;
  let router: jasmine.SpyObj<Router>;
  let ultimoUsuario: string | null;

  const criar = (query: Record<string, string> = {}) => {
    const route = { snapshot: { queryParamMap: convertToParamMap(query) } } as unknown as ActivatedRoute;
    const component = new LoginComponent(new FormBuilder(), auth, router, route);
    component.ngOnInit();
    return component;
  };

  const preencher = (component: LoginComponent, lembrar = false) =>
    component.form.setValue({ username: 'ana', password: 'senha', remember: lembrar });

  beforeEach(() => {
    ultimoUsuario = null;
    auth = jasmine.createSpyObj<AuthService>('AuthService', ['autenticar', 'tokenValido']);
    Object.defineProperty(auth, 'ultimoUsuario', { get: () => ultimoUsuario });
    auth.tokenValido.and.returnValue(false);
    router = jasmine.createSpyObj<Router>('Router', ['navigateByUrl']);
    spyOn(window, 'alert');
  });

  afterEach(() => expect(window.alert).not.toHaveBeenCalled());

  describe('envio', () => {
    it('campos vazios não enviam e mostram o erro de cada um', () => {
      const component = criar();

      component.submit();

      expect(auth.autenticar).not.toHaveBeenCalled();
      expect(component.erro('username')).toBe('Informe seu e-mail ou usuário.');
      expect(component.erro('password')).toBe('Informe sua senha.');
    });

    it('antes de tocar no campo ou enviar, não mostra erro', () => {
      expect(criar().erro('username')).toBe('');
    });

    it('vai para a home quando autentica, levando o "Lembrar"', () => {
      auth.autenticar.and.returnValue(of(true));
      const component = criar();
      preencher(component, true);

      component.submit();

      expect(auth.autenticar).toHaveBeenCalledWith('ana', 'senha', true);
      expect(router.navigateByUrl).toHaveBeenCalledWith('/home', { replaceUrl: true });
    });

    it('trava o formulário enquanto entra e libera no fim', () => {
      const resposta = new Subject<boolean>();
      auth.autenticar.and.returnValue(resposta);
      const component = criar();
      preencher(component);

      component.submit();
      expect(component.loading).toBeTrue();
      expect(component.form.disabled).toBeTrue();

      resposta.error(new HttpErrorResponse({ status: 401 }));
      expect(component.loading).toBeFalse();
      expect(component.form.enabled).toBeTrue();
    });
  });

  describe('recusa', () => {
    it('401 mostra a mensagem neutra, sem dizer qual dado está errado', () => {
      auth.autenticar.and.returnValue(throwError(() => new HttpErrorResponse({ status: 401, error: { message: 'outra' } })));
      const component = criar();
      preencher(component);

      component.submit();

      expect(component.erroLogin).toBe('Usuário/e-mail ou senha incorretos.');
    });

    it('API fora do ar mostra a mensagem de conexão', () => {
      auth.autenticar.and.returnValue(throwError(() => new HttpErrorResponse({ status: 0, error: new ProgressEvent('error') })));
      const component = criar();
      preencher(component);

      component.submit();

      expect(component.erroLogin).toBe('Não foi possível conectar. Tente novamente em instantes.');
    });

    it('a mensagem some quando a pessoa volta a digitar', () => {
      auth.autenticar.and.returnValue(throwError(() => new HttpErrorResponse({ status: 401 })));
      const component = criar();
      preencher(component);
      component.submit();

      component.form.controls.password.setValue('outra');

      expect(component.erroLogin).toBe('');
    });
  });

  describe('sessão expirada e volta', () => {
    it('avisa quando veio de uma sessão expirada', () => {
      expect(criar({ motivo: 'expirada' }).sessaoExpirada).toBeTrue();
      expect(criar().sessaoExpirada).toBeFalse();
    });

    it('depois de entrar, volta para a página pedida', () => {
      auth.autenticar.and.returnValue(of(true));
      const component = criar({ returnUrl: '/contas-a-pagar?mes=2026-11', motivo: 'expirada' });
      preencher(component);

      component.submit();

      expect(router.navigateByUrl).toHaveBeenCalledWith('/contas-a-pagar?mes=2026-11', { replaceUrl: true });
    });

    it('já logado, sai do login direto para o destino', () => {
      auth.tokenValido.and.returnValue(true);

      criar({ returnUrl: '/extrato-bancario' });

      expect(router.navigateByUrl).toHaveBeenCalledWith('/extrato-bancario', { replaceUrl: true });
    });

    it('só aceita destino interno', () => {
      expect(destinoSeguro('/contas-a-pagar')).toBe('/contas-a-pagar');
      expect(destinoSeguro('//site-externo.com')).toBe('/home');
      expect(destinoSeguro('/\\site-externo.com')).toBe('/home');
      expect(destinoSeguro('https://site-externo.com')).toBe('/home');
      expect(destinoSeguro('/login?returnUrl=/x')).toBe('/home');
      expect(destinoSeguro(null)).toBe('/home');
    });
  });

  describe('lembrar de mim', () => {
    it('vem desmarcado e vazio quando não há usuário lembrado', () => {
      const component = criar();

      expect(component.form.getRawValue()).toEqual({ username: '', password: '', remember: false });
      expect(component.focarSenha).toBeFalse();
    });

    it('com usuário lembrado, preenche, marca e põe o foco na senha', () => {
      ultimoUsuario = 'ana';

      const component = criar();

      expect(component.form.controls.username.value).toBe('ana');
      expect(component.form.controls.remember.value).toBeTrue();
      expect(component.focarSenha).toBeTrue();
    });
  });

  describe('tela', () => {
    const montar = (query: Record<string, string> = {}) => {
      TestBed.configureTestingModule({
        imports: [LoginModule],
        providers: [
          provideNoopAnimations(),
          provideRouter([]),
          { provide: AuthService, useValue: auth },
          { provide: ActivatedRoute, useValue: { snapshot: { queryParamMap: convertToParamMap(query) } } }
        ]
      });
      const fixture = TestBed.createComponent(LoginComponent);
      fixture.detectChanges();
      return fixture;
    };
    const el = (fixture: ComponentFixture<LoginComponent>) => fixture.nativeElement as HTMLElement;

    it('senha com o olho dentro do campo, ícone no usuário e sem emojis', () => {
      const fixture = montar();

      expect(el(fixture).querySelector('p-password[inputid=password] input#password')).not.toBeNull();
      expect(el(fixture).querySelector('p-iconfield .pi-user')).not.toBeNull();
      expect(el(fixture).querySelector('p-password .p-password-show-icon, p-password eyeicon')).not.toBeNull();
      expect(el(fixture).textContent).not.toMatch(/(?![©®™])\p{Extended_Pictographic}/u);
    });

    it('tem o link "Esqueci a senha" para a tela de recuperação', () => {
      const link = el(montar()).querySelector<HTMLAnchorElement>('a[href*="recuperar-senha"]');

      expect(link?.textContent).toContain('Esqueci a senha');
    });

    it('o foco começa no usuário', () => {
      const fixture = montar();

      expect(document.activeElement).toBe(el(fixture).querySelector('#username'));
    });

    it('mostra o aviso de sessão expirada', () => {
      expect(el(montar({ motivo: 'expirada' })).textContent).toContain('Sua sessão expirou');
    });

    it('mostra os erros de campo depois de tentar enviar', () => {
      const fixture = montar();

      fixture.componentInstance.submit();
      fixture.detectChanges();

      expect(el(fixture).textContent).toContain('Informe seu e-mail ou usuário.');
      expect(el(fixture).querySelector('#username.ng-invalid.ng-dirty')).not.toBeNull();
    });
  });

  it('avisa quando o Caps Lock está ligado', () => {
    const component = criar();

    component.verificarCapsLock(new KeyboardEvent('keyup', { modifierCapsLock: true }));
    expect(component.capsLock).toBeTrue();

    component.verificarCapsLock(new KeyboardEvent('keyup'));
    expect(component.capsLock).toBeFalse();
  });
});
