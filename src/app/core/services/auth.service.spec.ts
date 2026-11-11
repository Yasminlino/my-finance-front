import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';

import { AuthService } from './auth.service';
import { environment } from 'src/environments/environment';

/**
 * Card #70: "Lembrar de mim" decide onde a sessão fica. Marcado, no localStorage (sobrevive ao
 * navegador fechado) e o usuário fica salvo para o próximo login; desmarcado, no sessionStorage.
 */
describe('AuthService', () => {
  let service: AuthService;
  let http: HttpTestingController;
  const base = environment.apiBaseUrl.replace(/\/+$/, '');
  const futuro = new Date(Date.now() + 60 * 60 * 1000).toISOString();
  const passado = new Date(Date.now() - 60 * 1000).toISOString();

  const resposta = (dataExpiracao = futuro) => ({
    token: { token: 'jwt', dataExpiracao },
    usuario: { perfil: 'Empresa', nomeUsuario: 'Ana Lima' }
  });

  const entrar = (lembrar: boolean, dataExpiracao = futuro) => {
    let ok: boolean | undefined;
    service.autenticar('ana', 'senha', lembrar).subscribe(r => (ok = r));
    http.expectOne(`${base}/Autenticar`).flush(resposta(dataExpiracao));
    return ok;
  };

  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    service = TestBed.inject(AuthService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    http.verify();
    localStorage.clear();
    sessionStorage.clear();
  });

  it('com "Lembrar", guarda a sessão e o último usuário no localStorage', () => {
    expect(entrar(true)).toBeTrue();

    expect(localStorage.getItem('authToken')).toBe('jwt');
    expect(sessionStorage.getItem('authToken')).toBeNull();
    expect(service.ultimoUsuario).toBe('ana');
  });

  it('sem "Lembrar", guarda a sessão no sessionStorage e esquece o último usuário', () => {
    localStorage.setItem('ultimoUsuario', 'antigo');

    entrar(false);

    expect(sessionStorage.getItem('authToken')).toBe('jwt');
    expect(localStorage.getItem('authToken')).toBeNull();
    expect(service.ultimoUsuario).toBeNull();
  });

  it('lê token, nome e perfil de onde a sessão estiver', () => {
    entrar(false);

    expect(service.token).toBe('jwt');
    expect(service.nomeUsuario).toBe('Ana Lima');
    expect(service.perfil).toBe('Empresa');
    expect(service.tokenValido()).toBeTrue();
  });

  it('entrar de novo sem "Lembrar" apaga a sessão que estava no localStorage', () => {
    entrar(true);
    entrar(false);

    expect(localStorage.getItem('authToken')).toBeNull();
    expect(service.token).toBe('jwt');
  });

  it('token vencido não é válido, mas conta como sessão que existiu', () => {
    entrar(true, passado);

    expect(service.tokenValido()).toBeFalse();
    expect(service.teveSessao()).toBeTrue();
  });

  it('sem nenhuma sessão, não há token nem sessão anterior', () => {
    expect(service.tokenValido()).toBeFalse();
    expect(service.teveSessao()).toBeFalse();
  });

  it('resposta sem token não abre sessão', () => {
    let ok: boolean | undefined;
    service.autenticar('ana', 'senha', true).subscribe(r => (ok = r));
    http.expectOne(`${base}/Autenticar`).flush({ token: null, usuario: null });

    expect(ok).toBeFalse();
    expect(service.token).toBeNull();
  });

  it('o logout limpa os dois armazenamentos e mantém o último usuário', () => {
    entrar(true);
    sessionStorage.setItem('authToken', 'outro');
    localStorage.setItem('dataFiltro', '2026-11');

    service.logout();

    expect(service.token).toBeNull();
    expect(sessionStorage.getItem('authToken')).toBeNull();
    expect(localStorage.getItem('dataFiltro')).toBeNull();
    expect(service.ultimoUsuario).toBe('ana');
  });
});
