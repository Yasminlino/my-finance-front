import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';
import { ContaDto, LancamentoDaConta } from '../models/conta.model';

@Injectable({ providedIn: 'root' })
export class ContaService {
  constructor(private api: ApiService) {}

  listar(): Observable<ContaDto[]> {
    return this.api.get<ContaDto[]>('/GetAccounts');
  }

  listarAtivas(): Observable<ContaDto[]> {
    return this.api.get<ContaDto[]>('/GetContasAtivas');
  }

  /** Lançamentos da conta em Contas a Pagar, do mais recente para o mais antigo (card #22). */
  listarLancamentos(contaId: number): Observable<LancamentoDaConta[]> {
    return this.api.get<LancamentoDaConta[]>('/GetTransacoesDaConta', contaId);
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
