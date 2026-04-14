import { Injectable } from '@angular/core';
import { ApiService } from './api.service';

export type AccountDto = {
  id: number;
  name: string;
  value: any;
  dataOperacao: number; // ou number/dia
  categoryid: number;
  status: number;
  ehParcelado: boolean;
  parcelaAtual: number;
  quantidadeParcelas: number;
};

@Injectable({ providedIn: 'root' })
export class ContaService {
  constructor(private api: ApiService) {}

  list(): Promise<AccountDto[]> {
    return this.api.get<AccountDto[]>('/GetAccounts'); // ajuste endpoint
  }
  
  buscarContasAtivas(): Promise<AccountDto[]> {
    return this.api.get<AccountDto[]>('/GetContasAtivas'); // ajuste endpoint
  }

  create(payload: Partial<AccountDto>): Promise<any> {
    return this.api.post('/CreateAccount', payload); // ajuste endpoint
  }

  update(payload: Partial<AccountDto>): Promise<any> {
    return this.api.put('/UpdateAccount', { ...payload }); // ajuste endpoint
  }

  delete(id: number): Promise<any> {
    return this.api.delete('/DeleteAccount', id);
  }
}
