import { Injectable } from '@angular/core';
import { ApiService } from './api.service';

export type AccountDto = {
  id: number;
  name: string;
  value: number;
  dataOperacao?: number[]; // usado no envio
  categoryid: number;
  status: number;
  ehParcelado: boolean;
  parcelaAtual: number;
  quantidadeParcelas: number;

  contaVencimentos?: ContaVencimentoDto[]; // 👈 correto
};

export type ContaVencimentoDto = {
  id: number;
  contaId: number;
  dia: number;
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
