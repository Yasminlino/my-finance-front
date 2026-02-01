import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class ApiService {
  private baseUrl = 'http://localhost:5034'; 

  constructor(private http: HttpClient) {}

  get<T>(url: string): Promise<T> {
    return firstValueFrom(this.http.get<T>(this.baseUrl + url));
  }

  post<T>(url: string, body: any): Promise<T> {
    return firstValueFrom(this.http.post<T>(this.baseUrl + url, body));
  }

  put<T>(url: string, body: any): Promise<T> {
    return firstValueFrom(this.http.put<T>(this.baseUrl + url, body));
  }

  delete<T>(url: string, id: number): Promise<T> {
    return firstValueFrom(this.http.delete<T>(this.baseUrl + url + '/' + id));
  }
}
