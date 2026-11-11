import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';

/**
 * Acesso sem login (card #50): criar conta, confirmar o e-mail e recuperar a senha. Os pedidos com e-mail
 * respondem sempre igual (a API não revela quem tem conta); link vencido ou já usado volta como erro 400.
 */
@Injectable({ providedIn: 'root' })
export class AcessoService {
  constructor(private api: ApiService) {}

  cadastrar(nome: string, email: string, senha: string): Observable<void> {
    return this.api.post<void>('/cadastro', { nome, email, senha });
  }

  confirmarEmail(token: string): Observable<void> {
    return this.api.post<void>('/cadastro/confirmar', { token });
  }

  reenviarConfirmacao(email: string): Observable<void> {
    return this.api.post<void>('/cadastro/reenviar', { email });
  }

  esqueciSenha(email: string): Observable<void> {
    return this.api.post<void>('/senha/esqueci', { email });
  }

  redefinirSenha(token: string, senha: string): Observable<void> {
    return this.api.post<void>('/senha/redefinir', { token, senha });
  }
}
