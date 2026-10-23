import { HttpErrorResponse } from '@angular/common/http';

/**
 * Extrai uma mensagem legível de um erro vindo do HttpClient.
 *
 * Os endpoints da API devolvem `{ message: string }` no corpo do erro, que o Angular
 * expõe em `HttpErrorResponse.error`. Passar o próprio erro para o AlertService
 * (que recebe `string`) renderizava "[object Object]" no toast — ver FE-P0-07.
 */
/** O que este helper lê de um erro: o HttpErrorResponse (`error` = corpo) ou um Error comum. */
type ErroLido = {
  error?: string | { message?: unknown; title?: unknown; detail?: unknown } | null;
  message?: unknown;
} | null | undefined;

export function extrairMensagemErro(erro: unknown, fallback: string): string {
  if (typeof erro === 'string' && erro.trim()) {
    return erro;
  }

  const e = erro as ErroLido;

  const corpo = e?.error;

  // Corpo do erro como texto puro. A API responde sempre { message } (BE-P3-05), mas um proxy ou
  // servidor fora do ar pode devolver texto.
  if (typeof corpo === 'string' && corpo.trim()) {
    return corpo;
  }

  // Em HttpErrorResponse o `message` é sempre técnico ("Http failure response for ...:
  // 0 Unknown Error" quando a API está fora do ar) — nesse caso vale o fallback.
  const objeto = typeof corpo === 'object' ? corpo : null;
  const candidatos = [
    objeto?.message,
    objeto?.title,
    objeto?.detail,
    erro instanceof HttpErrorResponse ? undefined : e?.message
  ];

  for (const candidato of candidatos) {
    if (typeof candidato === 'string' && candidato.trim()) {
      return candidato;
    }
  }

  return fallback;
}
