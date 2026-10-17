import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';

/** Valores aceitos em query string; null/undefined não entram na URL. */
export type QueryParams = Record<string, string | number | boolean | null | undefined>;

/**
 * Acesso HTTP à API. Devolve Observable, o padrão do HttpClient (FE-P2-08): a tela decide
 * quando assinar e pode cancelar (switchMap na troca de mês). Token e 401 ficam no authInterceptor.
 */
@Injectable({ providedIn: 'root' })
export class ApiService {
  private baseUrl = environment.apiBaseUrl;

  constructor(private http: HttpClient) {}

  private buildUrl(url: string, id?: number) {
    const base = this.baseUrl.replace(/\/+$/, '');
    const path = url.startsWith('/') ? url : `/${url}`;
    return `${base}${path}${id != null ? `/${id}` : ''}`;
  }

  private toParams(params?: QueryParams): HttpParams | undefined {
    if (!params) return undefined;
    let httpParams = new HttpParams();
    for (const [chave, valor] of Object.entries(params)) {
      if (valor !== null && valor !== undefined) httpParams = httpParams.set(chave, String(valor));
    }
    return httpParams;
  }

  get<T>(url: string, id?: number, options?: { params?: QueryParams }): Observable<T> {
    return this.http.get<T>(this.buildUrl(url, id), { params: this.toParams(options?.params) });
  }

  post<T>(url: string, body: unknown): Observable<T> {
    return this.http.post<T>(this.buildUrl(url), body);
  }

  put<T>(url: string, body: unknown): Observable<T> {
    return this.http.put<T>(this.buildUrl(url), body);
  }

  delete<T>(url: string, id: number): Observable<T> {
    return this.http.delete<T>(this.buildUrl(url, id));
  }
}
