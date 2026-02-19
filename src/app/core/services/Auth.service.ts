// src/app/core/services/auth.service.ts
import { Injectable } from '@angular/core';
import { ApiService } from './api.service';
import { isoDateMinusHours } from '../utils/mask'

type AuthResponse = { token?: string, dataExpiracao?: Date };

@Injectable({ providedIn: 'root' })
export class AuthService {
  constructor(private api: ApiService) {}

  async authenticate(username: string, password: string, remember: boolean): Promise<boolean> {
    const payload = { login: username, senha: password };

    const response = await this.api.post<AuthResponse>('/Autenticar', payload);    

    if (response?.token) {
      localStorage.setItem('authToken', response.token);
      localStorage.setItem('expiraToken',response.dataExpiracao?.toString() ?? '');

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

  logout() {
    localStorage.removeItem('authToken');
  }

  get token(): string | null {
    return localStorage.getItem('authToken');
  }
}
