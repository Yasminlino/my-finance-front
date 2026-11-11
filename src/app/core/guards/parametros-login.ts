import { Params } from '@angular/router';

/**
 * queryParams do /login quando a sessão falta ou vence (card #70): a página para voltar depois de
 * entrar (menos a home e o próprio login, que não acrescentam nada) e o aviso de sessão expirada.
 */
export function parametrosLogin(returnUrl: string, expirada: boolean): Params {
  const params: Params = {};
  if (returnUrl && !['/', '/home'].includes(returnUrl) && !returnUrl.startsWith('/login')) {
    params['returnUrl'] = returnUrl;
  }
  if (expirada) {
    params['motivo'] = 'expirada';
  }
  return params;
}
