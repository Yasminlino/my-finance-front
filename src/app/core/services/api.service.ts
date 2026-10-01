import { Injectable, Injector } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from 'src/environments/environment';
import { Router } from '@angular/router';
import { AuthService } from './Auth.service';

@Injectable({ providedIn: 'root' })
export class ApiService {
  private baseUrl = environment.apiBaseUrl;

  // Usamos o Injector para evitar dependência circular (AuthService costuma injetar ApiService)
  constructor(
    private http: HttpClient,
    private router: Router,
    private injector: Injector
  ) {}

  private buildUrl(url: string, id?: number) {
    const base = this.baseUrl.replace(/\/+$/, '');
    const path = url.startsWith('/') ? url : `/${url}`;
    return `${base}${path}${id != null ? `/${id}` : ''}`;
  }

  private async handleRequest<T>(requestPromise: Promise<T>): Promise<T> {
    try {
      return await requestPromise;
    } catch (error: any) {
      if (error instanceof HttpErrorResponse && error.status === 401) {
        // Resolve o AuthService de forma tardia para evitar dependência circular
        const authService = this.injector.get(AuthService);
        authService.logout();
        this.router.navigate(['/login']);
      }
      throw error;
    }
  }

  get<T>(url: string, id?: number): Promise<T> {
    return this.handleRequest(firstValueFrom(this.http.get<T>(this.buildUrl(url, id))));
  }

  post<T>(url: string, body: any): Promise<T> {
    return this.handleRequest(firstValueFrom(this.http.post<T>(this.buildUrl(url), body)));
  }

  put<T>(url: string, body: any): Promise<T> {
    return this.handleRequest(firstValueFrom(this.http.put<T>(this.buildUrl(url), body)));
  }

  delete<T>(url: string, id: number): Promise<T> {
    return this.handleRequest(firstValueFrom(this.http.delete<T>(this.buildUrl(url, id))));
  }
}