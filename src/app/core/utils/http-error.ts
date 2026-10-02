import { HttpErrorResponse } from '@angular/common/http';

/**
 * Extrai uma mensagem legível de um erro vindo do HttpClient.
 *
 * Os endpoints da API devolvem `{ message: string }` no corpo do erro, que o Angular
 * expõe em `HttpErrorResponse.error`. Passar o próprio erro para o AlertService
 * (que recebe `string`) renderizava "[object Object]" no toast — ver FE-P0-07.
 */
export function extrairMensagemErro(erro: unknown, fallback: string): string {
  if (typeof erro === 'string' && erro.trim()) {
    return erro;
  }

  const e = erro as any;

  const corpo = e?.error;

  // Corpo do erro como texto puro (ex.: Unauthorized("Usuário não autorizado!")).
  if (typeof corpo === 'string' && corpo.trim()) {
    return corpo;
  }

  // Em HttpErrorResponse o `message` é sempre técnico ("Http failure response for ...:
  // 0 Unknown Error" quando a API está fora do ar) — nesse caso vale o fallback.
  const candidatos = [
    corpo?.message,
    corpo?.title,
    corpo?.detail,
    erro instanceof HttpErrorResponse ? undefined : e?.message
  ];

  for (const candidato of candidatos) {
    if (typeof candidato === 'string' && candidato.trim()) {
      return candidato;
    }
  }

  return fallback;
}
