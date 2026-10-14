import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';
import { ContaDto } from '../models/conta.model';

@Injectable({ providedIn: 'root' })
export class ContaService {
  constructor(private api: ApiService) {}

  listar(): Observable<ContaDto[]> {
    return this.api.get<ContaDto[]>('/GetAccounts');
  }

  listarAtivas(): Observable<ContaDto[]> {
    return this.api.get<ContaDto[]>('/GetContasAtivas');
  }

  criar(dto: Partial<ContaDto>): Observable<unknown> {
    return this.api.post('/CreateAccount', dto);
  }

  atualizar(dto: Partial<ContaDto>): Observable<unknown> {
    return this.api.put('/UpdateAccount', dto);
  }

  excluir(id: number): Observable<unknown> {
    return this.api.delete('/DeleteAccount', id);
  }
}
