import { Injectable } from '@angular/core';
import { ApiService } from './api.service';

export type AccountDto = {
  id: number;
  name: string;
  value: number;
  dataOperacao: number; // ou number/dia
  categoryid: number;
};

@Injectable({ providedIn: 'root' })
export class ContaService {
  constructor(private api: ApiService) {}

  list(): Promise<AccountDto[]> {
    return this.api.get<AccountDto[]>('/GetAccounts'); // ajuste endpoint
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
