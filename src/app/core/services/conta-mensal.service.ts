import { Injectable } from '@angular/core';
import { ApiService } from './api.service';
import { AgrupamentoContaMensal, ContaMensal, LinhaContaMensal } from '../models/conta-mensal.model';

@Injectable({ providedIn: 'root' })
export class ContaMensalService {
  constructor(private api: ApiService) {}

  getGroupingByMonth(yyyymm: string, pesquisaDataCompleta: boolean = false): Promise<any[]> {
    // ajuste endpoint/params conforme seu backend
    return this.api.get<any[]>(`/GetTransactionGroupingByDate/${yyyymm}/${pesquisaDataCompleta}`);
  }
  
  GetTransactionByDate(yyyymm: string, pesquisaDataCompleta: boolean = false): Promise<ContaMensal[]> {
    // ajuste endpoint/params conforme seu backend
    return this.api.get<ContaMensal[]>(`/GetTransactionByDate/${yyyymm}/${pesquisaDataCompleta}`);
  }
  
  BuscaContasVencidas(yyyymm: string): Promise<ContaMensal[]> {
    // ajuste endpoint/params conforme seu backend
    return this.api.get<ContaMensal[]>(`/GetContaVencida/${yyyymm}`);
  }
  
  GetTransactionByDate2(date: Date): Promise<ContaMensal[]> {
    // ajuste endpoint/params conforme seu backend
    return this.api.get<ContaMensal[]>('/GetTransactionByDate/' + date);
  }

  async createContaMensal(payload: any): Promise<any> {
    return await this.api.post<any>('/CreateTransaction', payload);
  }

  updateTransaction(payload: any): Promise<any> {
    return this.api.put<any>('/UpdateTransaction', payload);
  }

  deleteTransaction(id: number): Promise<any> {
    return this.api.delete<any>('/DeleteTransaction',id);
  }
}
