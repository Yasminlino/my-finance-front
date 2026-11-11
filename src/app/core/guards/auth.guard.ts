import { Injectable } from '@angular/core';
import { ActivatedRouteSnapshot, CanActivate, Router, RouterStateSnapshot, UrlTree } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { parametrosLogin } from './parametros-login';

/** Sem sessão válida, vai para o login levando a página pedida (card #70). */
@Injectable({ providedIn: 'root' })
export class AuthGuard implements CanActivate {
  constructor(private auth: AuthService, private router: Router) {}

  canActivate(_route: ActivatedRouteSnapshot, state: RouterStateSnapshot): boolean | UrlTree {
    if (this.auth.tokenValido()) return true;
    return this.router.createUrlTree(['/login'], {
      queryParams: parametrosLogin(state.url, this.auth.teveSessao())
    });
  }
}
