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
  const auth = jasmine.createSpyObj<AuthService>('AuthService', ['logout']);
  const router = jasmine.createSpyObj<Router>('Router', ['navigate']);

  beforeEach(() => {
    auth.logout.calls.reset();
    router.navigate.calls.reset();
    localStorage.removeItem('authToken');
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

  afterEach(() => {
    controller.verify();
    localStorage.removeItem('authToken');
  });

  it('manda o token quando existe', () => {
    localStorage.setItem('authToken', 'abc');
    http.get('/x').subscribe();

    expect(controller.expectOne('/x').request.headers.get('Authorization')).toBe('Bearer abc');
  });

  it('sem token, não manda o cabeçalho', () => {
    http.get('/x').subscribe();

    expect(controller.expectOne('/x').request.headers.has('Authorization')).toBeFalse();
  });

  it('401: sai da sessão, vai para o login e repassa o erro', () => {
    let status = 0;
    http.get('/x').subscribe({ error: e => (status = e.status) });

    controller.expectOne('/x').flush(null, { status: 401, statusText: 'Unauthorized' });

    expect(auth.logout).toHaveBeenCalled();
    expect(router.navigate).toHaveBeenCalledWith(['/login']);
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
