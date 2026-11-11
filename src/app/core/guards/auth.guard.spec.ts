import { TestBed } from '@angular/core/testing';
import { ActivatedRouteSnapshot, Router, RouterStateSnapshot, UrlTree, provideRouter } from '@angular/router';

import { AuthGuard } from './auth.guard';
import { AuthService } from '../services/auth.service';

/**
 * Card #70: sem sessão válida, vai para o login levando a página pedida (returnUrl), e avisa
 * "sessão expirada" quando havia um token vencido.
 */
describe('AuthGuard', () => {
  let auth: jasmine.SpyObj<AuthService>;
  let guard: AuthGuard;
  let router: Router;

  const ativar = (url: string) =>
    guard.canActivate({} as ActivatedRouteSnapshot, { url } as RouterStateSnapshot);

  beforeEach(() => {
    auth = jasmine.createSpyObj<AuthService>('AuthService', ['tokenValido', 'teveSessao']);
    TestBed.configureTestingModule({
      providers: [provideRouter([]), { provide: AuthService, useValue: auth }]
    });
    guard = TestBed.inject(AuthGuard);
    router = TestBed.inject(Router);
  });

  it('deixa passar com token válido', () => {
    auth.tokenValido.and.returnValue(true);

    expect(ativar('/contas-a-pagar')).toBeTrue();
  });

  it('sem sessão, vai para o login com a página pedida', () => {
    auth.tokenValido.and.returnValue(false);
    auth.teveSessao.and.returnValue(false);

    const destino = router.serializeUrl(ativar('/contas-a-pagar?mes=2026-11') as UrlTree);

    expect(destino).toBe('/login?returnUrl=%2Fcontas-a-pagar%3Fmes%3D2026-11');
  });

  it('com sessão vencida, avisa que expirou', () => {
    auth.tokenValido.and.returnValue(false);
    auth.teveSessao.and.returnValue(true);

    const destino = router.serializeUrl(ativar('/extrato-bancario') as UrlTree);

    expect(destino).toBe('/login?returnUrl=%2Fextrato-bancario&motivo=expirada');
  });

  it('a home não vira returnUrl', () => {
    auth.tokenValido.and.returnValue(false);
    auth.teveSessao.and.returnValue(false);

    expect(router.serializeUrl(ativar('/') as UrlTree)).toBe('/login');
  });
});
