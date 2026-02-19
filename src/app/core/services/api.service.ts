import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from 'src/environments/environment';

@Injectable({ providedIn: 'root' })
export class ApiService {
  private baseUrl = environment.apiBaseUrl;

  constructor(private http: HttpClient) {}

  private buildUrl(url: string, id?: number) {
    const base = this.baseUrl.replace(/\/+$/, '');
    const path = url.startsWith('/') ? url : `/${url}`;
    return `${base}${path}${id != null ? `/${id}` : ''}`;
  }

  get<T>(url: string, id?: number): Promise<T> {
    return firstValueFrom(this.http.get<T>(this.buildUrl(url, id)));
  }

  post<T>(url: string, body: any): Promise<T> {
    return firstValueFrom(this.http.post<T>(this.buildUrl(url), body));
  }

  put<T>(url: string, body: any): Promise<T> {
    return firstValueFrom(this.http.put<T>(this.buildUrl(url), body));
  }

  delete<T>(url: string, id: number): Promise<T> {
    return firstValueFrom(this.http.delete<T>(this.buildUrl(url, id)));
  }
}
