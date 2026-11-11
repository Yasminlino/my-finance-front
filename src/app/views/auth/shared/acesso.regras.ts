import { HttpErrorResponse } from '@angular/common/http';
import { AbstractControl, FormControl, ValidationErrors, ValidatorFn, Validators } from '@angular/forms';
import { extrairMensagemErro } from 'src/app/core/utils/http-error';

/**
 * Regras das telas de acesso (card #50). As da senha são as mesmas da API: 8 caracteres, uma letra e
 * um número. A API confere de novo; aqui é para mostrar ✓ enquanto a pessoa digita.
 */
export type RequisitosSenha = { tamanho: boolean; letra: boolean; numero: boolean };

export function requisitosSenha(senha: string | null | undefined): RequisitosSenha {
  const valor = senha ?? '';
  return {
    tamanho: valor.length >= 8,
    letra: /\p{L}/u.test(valor),
    numero: /\d/.test(valor),
  };
}

export const senhaForte: ValidatorFn = (controle: AbstractControl): ValidationErrors | null => {
  const r = requisitosSenha(controle.value);
  return r.tamanho && r.letra && r.numero ? null : { senhaFraca: true };
};

/**
 * Validators.email sem contar os espaços das pontas: o preenchimento automático do celular costuma
 * deixar um espaço no fim, e o envio já faz trim.
 */
export const emailValido: ValidatorFn = (controle: AbstractControl): ValidationErrors | null =>
  Validators.email(new FormControl(String(controle.value ?? '').trim()));

/** No grupo: "confirmar" igual a "senha". */
export const senhasIguais: ValidatorFn = (grupo: AbstractControl): ValidationErrors | null => {
  const senha = grupo.get('senha')?.value;
  const confirmar = grupo.get('confirmar')?.value;
  return confirmar && senha !== confirmar ? { senhasDiferentes: true } : null;
};

export const LINK_INVALIDO = 'Este link expirou ou já foi usado.';
export const MENSAGEM_CONEXAO = 'Não foi possível conectar. Tente novamente em instantes.';

/** Mensagem para a tela: a da API em 4xx (inclui o 429 "Muitas tentativas"); conexão no resto. */
export function mensagemDoErro(erro: unknown): string {
  const status = erro instanceof HttpErrorResponse ? erro.status : 0;
  return status >= 400 && status < 500 ? extrairMensagemErro(erro, MENSAGEM_CONEXAO) : MENSAGEM_CONEXAO;
}

/** Link do e-mail vencido ou já usado (a API responde 400 com essa mensagem). */
export function ehLinkInvalido(erro: unknown): boolean {
  return erro instanceof HttpErrorResponse && erro.status === 400 && extrairMensagemErro(erro, '') === LINK_INVALIDO;
}
