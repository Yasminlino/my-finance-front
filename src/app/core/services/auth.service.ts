import { Injectable } from '@angular/core';
import { Observable, map } from 'rxjs';
import { ApiService } from './api.service';

/** Resposta de /Autenticar: o token com a validade e o usuário (perfil e nome vão para o localStorage). */
type AuthResponse = {
  token: { token: string; dataExpiracao?: string | null } | null;
  usuario: { perfil?: string | null; nomeUsuario?: string | null } | null;
};

@Injectable({ providedIn: 'root' })
export class AuthService {
  constructor(private api: ApiService) {}

  /** Autentica e guarda a sessão; emite true quando a API devolve um token. */
  autenticar(usuario: string, senha: string, lembrar: boolean): Observable<boolean> {
    return this.api.post<AuthResponse>('/Autenticar', { login: usuario, senha })
      .pipe(map(resposta => this.guardarSessao(resposta, lembrar)));
  }

  private guardarSessao(response: AuthResponse | null, remember: boolean): boolean {
    if (!response?.token?.token) return false;

    localStorage.setItem('authToken', response.token.token);
    localStorage.setItem('expiraToken', response.token.dataExpiracao?.toString() ?? '');
    localStorage.setItem('usuarioRole', response.usuario?.perfil ?? '');
    localStorage.setItem('usuarioNome', response.usuario?.nomeUsuario ?? '');

    if (remember) {
      localStorage.setItem('remember', '1');
    } else {
      localStorage.removeItem('remember');
      localStorage.removeItem('lastUser');
    }
    return true;
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
