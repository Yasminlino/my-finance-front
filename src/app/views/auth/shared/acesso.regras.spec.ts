import { HttpErrorResponse } from '@angular/common/http';
import { fakeAsync, tick } from '@angular/core/testing';
import { FormControl, FormGroup } from '@angular/forms';

import { ehLinkInvalido, emailValido, mensagemDoErro, requisitosSenha, senhaForte, senhasIguais, usuarioValido } from './acesso.regras';
import { ContagemReenvio } from './contagem-reenvio';

/** Card #50: regras das telas de acesso (as da senha são as mesmas da API). */
describe('acesso.regras', () => {
  it('requisitos da senha: 8 caracteres, letra e número', () => {
    expect(requisitosSenha('')).toEqual({ tamanho: false, letra: false, numero: false });
    expect(requisitosSenha('abc12345')).toEqual({ tamanho: true, letra: true, numero: true });
    expect(requisitosSenha('çãéíóú99')).toEqual({ tamanho: true, letra: true, numero: true });
    expect(senhaForte(new FormControl('12345678'))).toEqual({ senhaFraca: true });
    expect(senhaForte(new FormControl('Senha123'))).toBeNull();
  });

  it('e-mail com espaço nas pontas (preenchimento automático) ainda é válido', () => {
    expect(emailValido(new FormControl(' ana@exemplo.com '))).toBeNull();
    expect(emailValido(new FormControl('ana@'))).toEqual({ email: true });
  });

  it('nome de usuário: 3 a 30, começa por letra, sem acento nem "@" (card #84)', () => {
    for (const valido of ['ana', 'Ana.Lima', 'ana_2-b', ' ana ', 'a12345678901234567890123456789']) {
      expect(usuarioValido(new FormControl(valido))).withContext(valido).toBeNull();
    }
    for (const invalido of ['', 'ab', '1ana', 'ana@lima', 'ana lima', 'anã', 'a123456789012345678901234567890']) {
      expect(usuarioValido(new FormControl(invalido))).withContext(invalido).toEqual({ usuarioInvalido: true });
    }
  });

  it('confirmação precisa ser igual à senha', () => {
    const grupo = (senha: string, confirmar: string) =>
      new FormGroup({ senha: new FormControl(senha), confirmar: new FormControl(confirmar) });

    expect(senhasIguais(grupo('Senha123', 'Senha124'))).toEqual({ senhasDiferentes: true });
    expect(senhasIguais(grupo('Senha123', 'Senha123'))).toBeNull();
    expect(senhasIguais(grupo('Senha123', ''))).toBeNull();
  });

  it('mensagem: a da API em 4xx, conexão no resto', () => {
    const erro = (status: number, message?: string) => new HttpErrorResponse({ status, error: message ? { message } : null });

    expect(mensagemDoErro(erro(429, 'Muitas tentativas. Aguarde um minuto e tente de novo.'))).toBe('Muitas tentativas. Aguarde um minuto e tente de novo.');
    expect(mensagemDoErro(erro(400, 'Informe um e-mail válido.'))).toBe('Informe um e-mail válido.');
    expect(mensagemDoErro(erro(0))).toBe('Não foi possível conectar. Tente novamente em instantes.');
    expect(mensagemDoErro(erro(500, 'interno'))).toBe('Não foi possível conectar. Tente novamente em instantes.');
  });

  it('reconhece o link vencido', () => {
    expect(ehLinkInvalido(new HttpErrorResponse({ status: 400, error: { message: 'Este link expirou ou já foi usado.' } }))).toBeTrue();
    expect(ehLinkInvalido(new HttpErrorResponse({ status: 400, error: { message: 'Outra coisa.' } }))).toBeFalse();
  });

  it('contagem libera o reenvio depois do tempo', fakeAsync(() => {
    const contagem = new ContagemReenvio(3);
    expect(contagem.liberado()).toBeTrue();

    contagem.iniciar();
    expect(contagem.segundos()).toBe(3);
    expect(contagem.liberado()).toBeFalse();

    tick(3000);
    expect(contagem.liberado()).toBeTrue();
    contagem.parar();
  }));
});
