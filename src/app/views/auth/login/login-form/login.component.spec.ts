import { HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { FormBuilder } from '@angular/forms';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { Router } from '@angular/router';
import { of, throwError } from 'rxjs';

import { LoginComponent } from './login.component';
import { AuthService } from 'src/app/core/services/auth.service';
import { LoginModule } from '../login.module';

/** Login: a mensagem de falha vem da API ("Usuário não encontrado..."), com a genérica de reserva. */
describe('LoginComponent', () => {
  let auth: jasmine.SpyObj<AuthService>;
  let router: jasmine.SpyObj<Router>;
  let component: LoginComponent;

  beforeEach(() => {
    auth = jasmine.createSpyObj<AuthService>('AuthService', ['autenticar']);
    router = jasmine.createSpyObj<Router>('Router', ['navigate']);
    component = new LoginComponent(new FormBuilder(), auth, router);
    component.form.setValue({ username: 'usuario', password: 'senha123', remember: true });
    spyOn(window, 'alert');
  });

  it('vai para o Home quando autentica', () => {
    auth.autenticar.and.returnValue(of(true));

    component.submit();

    expect(router.navigate).toHaveBeenCalledWith(['/home'], { replaceUrl: true });
    expect(window.alert).not.toHaveBeenCalled();
  });

  it('mostra a mensagem da API quando o usuário não é encontrado', () => {
    auth.autenticar.and.returnValue(throwError(() => new HttpErrorResponse({
      status: 404,
      error: 'Usuário não encontrado. Verifique o login e senha.'
    })));

    component.submit();

    expect(window.alert).toHaveBeenCalledWith('Usuário não encontrado. Verifique o login e senha.');
    expect(component.loading).toBeFalse();
  });

  it('usa a mensagem genérica quando a API está fora do ar', () => {
    auth.autenticar.and.returnValue(throwError(() => new HttpErrorResponse({ status: 0, error: new ProgressEvent('error') })));

    component.submit();

    expect(window.alert).toHaveBeenCalledWith('Não foi possível autenticar. Tente novamente.');
  });
});

/** Tela de login em PrimeNG + PrimeFlex, sem emojis (FE-P2-07). */
describe('LoginComponent (tela)', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [LoginModule],
      providers: [
        provideNoopAnimations(),
        { provide: AuthService, useValue: jasmine.createSpyObj('AuthService', ['autenticar']) },
        { provide: Router, useValue: jasmine.createSpyObj('Router', ['navigate']) }
      ]
    });
  });

  it('usa campos PrimeNG e o olho da senha é um ícone do PrimeIcons', () => {
    const fixture = TestBed.createComponent(LoginComponent);
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;

    expect(el.querySelector('input#username.p-inputtext')).not.toBeNull();
    expect(el.querySelector('p-checkbox[formControlName=remember]')).not.toBeNull();
    expect(el.querySelector('.pi-eye')).not.toBeNull();
    expect(el.textContent).not.toMatch(/\p{Extended_Pictographic}/u);

    fixture.componentInstance.togglePwd();
    fixture.detectChanges();
    expect(el.querySelector('.pi-eye-slash')).not.toBeNull();
    expect(el.querySelector<HTMLInputElement>('#password')!.type).toBe('text');
  });
});
