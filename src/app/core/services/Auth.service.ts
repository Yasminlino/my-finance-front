// src/app/core/services/auth.service.ts
import { Injectable } from '@angular/core';
import { ApiService } from './api.service';
import { isoDateMinusHours } from '../utils/mask'

type AuthResponse = { token: any, usuario: any };

@Injectable({ providedIn: 'root' })
export class AuthService {
  constructor(private api: ApiService) {}

  async authenticate(username: string, password: string, remember: boolean): Promise<boolean> {
    const payload = { login: username, senha: password };

    const response = await this.api.post<AuthResponse>('/Autenticar', payload);    

    if (response?.token?.token) {
      localStorage.setItem('authToken', response.token?.token);
      localStorage.setItem('expiraToken',response.token.dataExpiracao?.toString() ?? '');
      localStorage.setItem('usuarioRole', response?.usuario.role ?? '');
      localStorage.setItem('usuarioNome', response?.usuario.nomeUsuario ?? '');

      if (remember) {
        localStorage.setItem('remember', '1');
        // localStorage.setItem('lastUser', username);
      } else {
        localStorage.removeItem('remember');
        localStorage.removeItem('lastUser');
      }

      // se você tiver estado global depois, aqui é o lugar de setar
      return true;
    }

    return false;
  }

  /**
   * Chaves de localStorage escritas pelo app e atreladas ao usuário logado.
   * Antes o logout removia só o authToken: `usuarioNome` sobrevivia e o header,
   * que lê a chave no construtor, mostrava o nome do usuário anterior (FE-P0-09).
   */
  private static readonly CHAVES_DE_SESSAO = [
    'authToken',
    'expiraToken',
    'usuarioRole',
    'usuarioNome',
    'remember',
    'lastUser',
    // Filtros de período, persistidos por tela.
    'dataFiltro',
    'dataFiltroResumo',
    'dataFiltroContaMensal',
    'dataFiltroDetalheExtrato'
  ];

  logout() {
    for (const chave of AuthService.CHAVES_DE_SESSAO) {
      localStorage.removeItem(chave);
    }
  }

  get token(): string | null {
    return localStorage.getItem('authToken');
  }
}
