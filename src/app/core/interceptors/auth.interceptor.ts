import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { AuthService } from '../services/auth.service';
import { parametrosLogin } from '../guards/parametros-login';

/**
 * Injeta o token e trata o 401 num lugar só (FE-P2-08): sessão inválida ou expirada
 * sai do app e volta para o login, avisando e levando a página atual (card #70).
 * O 401 do /Autenticar é login recusado, não sessão vencida: fica com a tela de login.
 * O erro segue para quem chamou.
 */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const token = auth.token;

  const requisicao = token ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } }) : req;

  return next(requisicao).pipe(
    catchError((erro: unknown) => {
      if (erro instanceof HttpErrorResponse && erro.status === 401 && !req.url.endsWith('/Autenticar')) {
        auth.logout();
        router.navigate(['/login'], { queryParams: parametrosLogin(router.url, true) });
      }
      return throwError(() => erro);
    })
  );
};
