import { TestBed } from '@angular/core/testing';
import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Router } from '@angular/router';

import { authInterceptor } from './auth.interceptor';
import { AuthService } from '../services/auth.service';

/** FE-P2-08: o token e o 401 são tratados num lugar só, no interceptor. */
describe('authInterceptor', () => {
  let http: HttpClient;
  let controller: HttpTestingController;
  let auth: jasmine.SpyObj<AuthService>;
  let token: string | null;
  const router = jasmine.createSpyObj<Router>('Router', ['navigate'], { url: '/contas-a-pagar' });

  beforeEach(() => {
    token = null;
    auth = jasmine.createSpyObj<AuthService>('AuthService', ['logout']);
    Object.defineProperty(auth, 'token', { get: () => token });
    router.navigate.calls.reset();
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
        { provide: AuthService, useValue: auth },
        { provide: Router, useValue: router },
      ]
    });
    http = TestBed.inject(HttpClient);
    controller = TestBed.inject(HttpTestingController);
  });

  afterEach(() => controller.verify());

  it('manda o token quando existe', () => {
    token = 'abc';
    http.get('/x').subscribe();

    expect(controller.expectOne('/x').request.headers.get('Authorization')).toBe('Bearer abc');
  });

  it('sem token, não manda o cabeçalho', () => {
    http.get('/x').subscribe();

    expect(controller.expectOne('/x').request.headers.has('Authorization')).toBeFalse();
  });

  it('401: sai da sessão, vai para o login avisando que expirou e repassa o erro', () => {
    let status = 0;
    http.get('/x').subscribe({ error: e => (status = e.status) });

    controller.expectOne('/x').flush(null, { status: 401, statusText: 'Unauthorized' });

    expect(auth.logout).toHaveBeenCalled();
    expect(router.navigate).toHaveBeenCalledWith(['/login'], {
      queryParams: { returnUrl: '/contas-a-pagar', motivo: 'expirada' }
    });
    expect(status).toBe(401);
  });

  it('401 do /Autenticar é senha errada, não sessão vencida: só repassa o erro', () => {
    let status = 0;
    http.post('https://api.exemplo/Autenticar', {}).subscribe({ error: e => (status = e.status) });

    controller.expectOne('https://api.exemplo/Autenticar').flush({ message: 'x' }, { status: 401, statusText: 'Unauthorized' });

    expect(auth.logout).not.toHaveBeenCalled();
    expect(router.navigate).not.toHaveBeenCalled();
    expect(status).toBe(401);
  });

  it('outros erros só são repassados', () => {
    let status = 0;
    http.get('/x').subscribe({ error: e => (status = e.status) });

    controller.expectOne('/x').flush({ message: 'x' }, { status: 409, statusText: 'Conflict' });

    expect(auth.logout).not.toHaveBeenCalled();
    expect(status).toBe(409);
  });
});
