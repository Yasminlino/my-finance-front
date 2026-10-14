import { HttpErrorResponse } from '@angular/common/http';
import { FormBuilder } from '@angular/forms';
import { Router } from '@angular/router';
import { of, throwError } from 'rxjs';

import { LoginComponent } from './login.component';
import { AuthService } from 'src/app/core/services/auth.service';

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
