import { HttpErrorResponse } from '@angular/common/http';
import { extrairMensagemErro } from './http-error';

describe('extrairMensagemErro', () => {
  const fallback = 'Erro ao carregar.';

  it('usa o message do corpo da resposta (FE-P0-07)', () => {
    const erro = new HttpErrorResponse({
      status: 500,
      error: { message: 'Ocorreu um erro inesperado.' }
    });

    expect(extrairMensagemErro(erro, fallback)).toBe('Ocorreu um erro inesperado.');
  });

  it('aceita corpo de erro em texto puro', () => {
    const erro = new HttpErrorResponse({
      status: 401,
      error: 'Usuário não autorizado!'
    });

    expect(extrairMensagemErro(erro, fallback)).toBe('Usuário não autorizado!');
  });

  it('usa o fallback quando a API está fora do ar, em vez do message técnico do Angular (FE-P0-11)', () => {
    const erro = new HttpErrorResponse({ status: 0, statusText: 'Unknown Error' });

    expect(extrairMensagemErro(erro, fallback)).toBe(fallback);
  });

  it('ainda usa o message de erros que não são HTTP', () => {
    expect(extrairMensagemErro(new Error('Falha ao montar o filtro'), fallback)).toBe('Falha ao montar o filtro');
  });

  it('usa o fallback quando não há nada aproveitável', () => {
    expect(extrairMensagemErro({}, fallback)).toBe(fallback);
    expect(extrairMensagemErro(null, fallback)).toBe(fallback);
    expect(extrairMensagemErro(undefined, fallback)).toBe(fallback);
    expect(extrairMensagemErro('   ', fallback)).toBe(fallback);
  });

  it('nunca devolve "[object Object]"', () => {
    const erro = new HttpErrorResponse({ status: 500, error: { foo: 'bar' } });

    expect(extrairMensagemErro(erro, fallback)).not.toContain('[object Object]');
  });

  it('repassa a string quando já recebe uma mensagem pronta', () => {
    expect(extrairMensagemErro('Falha de rede', fallback)).toBe('Falha de rede');
  });
});
