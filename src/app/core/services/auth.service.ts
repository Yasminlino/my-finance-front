import { Injectable } from '@angular/core';
import { Observable, map } from 'rxjs';
import { ApiService } from './api.service';

/** Resposta de /Autenticar: o token com a validade e o usuário (perfil e nome ficam na sessão). */
type AuthResponse = {
  token: { token: string; dataExpiracao?: string | null } | null;
  usuario: { perfil?: string | null; nomeUsuario?: string | null } | null;
};

/**
 * Sessão do usuário. "Lembrar de mim" (card #70) decide onde ela fica: marcado, no localStorage,
 * que sobrevive ao navegador fechado; desmarcado, no sessionStorage. Quem precisa da sessão lê por
 * aqui (token, nome, perfil), nunca direto do storage, para valer nos dois casos.
 */
@Injectable({ providedIn: 'root' })
export class AuthService {
  constructor(private api: ApiService) {}

  /** Autentica e guarda a sessão; emite true quando a API devolve um token. */
  autenticar(usuario: string, senha: string, lembrar: boolean): Observable<boolean> {
    return this.api.post<AuthResponse>('/Autenticar', { login: usuario, senha })
      .pipe(map(resposta => this.guardarSessao(resposta, usuario, lembrar)));
  }

  private guardarSessao(response: AuthResponse | null, usuario: string, lembrar: boolean): boolean {
    if (!response?.token?.token) return false;

    // Uma sessão só: a anterior sai dos dois storages antes de gravar a nova.
    this.logout();
    const storage = lembrar ? localStorage : sessionStorage;
    storage.setItem('authToken', response.token.token);
    storage.setItem('expiraToken', response.token.dataExpiracao?.toString() ?? '');
    storage.setItem('usuarioRole', response.usuario?.perfil ?? '');
    storage.setItem('usuarioNome', response.usuario?.nomeUsuario ?? '');

    if (lembrar) {
      localStorage.setItem(AuthService.ULTIMO_USUARIO, usuario);
    } else {
      localStorage.removeItem(AuthService.ULTIMO_USUARIO);
    }
    return true;
  }

  /**
   * Chaves atreladas ao usuário logado, limpas no logout dos dois storages.
   * Antes o logout removia só o authToken: `usuarioNome` sobrevivia e o header,
   * que lê a chave no construtor, mostrava o nome do usuário anterior (FE-P0-09).
   */
  private static readonly CHAVES_DE_SESSAO = [
    'authToken',
    'expiraToken',
    'usuarioRole',
    'usuarioNome',
    // Chaves do "Lembrar" antigo (antes do card #70), só para limpar o que ficou.
    'remember',
    'lastUser',
    // Filtros de período, persistidos por tela.
    'dataFiltro',
    'dataFiltroResumo',
    'dataFiltroContaMensal',
    'dataFiltroDetalheExtrato'
  ];

  /** Fora da sessão de propósito: o login pré-preenche o usuário depois do logout. */
  private static readonly ULTIMO_USUARIO = 'ultimoUsuario';

  logout() {
    for (const chave of AuthService.CHAVES_DE_SESSAO) {
      localStorage.removeItem(chave);
      sessionStorage.removeItem(chave);
    }
  }

  private ler(chave: string): string | null {
    return localStorage.getItem(chave) ?? sessionStorage.getItem(chave);
  }

  get token(): string | null {
    return this.ler('authToken');
  }

  get nomeUsuario(): string | null {
    return this.ler('usuarioNome');
  }

  get perfil(): string | null {
    return this.ler('usuarioRole');
  }

  /** Usuário do último login com "Lembrar de mim" marcado. */
  get ultimoUsuario(): string | null {
    return localStorage.getItem(AuthService.ULTIMO_USUARIO);
  }

  /** Há token e ele ainda não venceu. */
  tokenValido(): boolean {
    const expira = this.ler('expiraToken');
    return !!this.token && !!expira && new Date(expira) > new Date();
  }

  /** Havia uma sessão, mesmo vencida: o login mostra "sua sessão expirou" em vez de nada. */
  teveSessao(): boolean {
    return !!this.token;
  }
}
