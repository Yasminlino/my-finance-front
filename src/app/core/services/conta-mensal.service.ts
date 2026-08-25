import { Injectable } from '@angular/core';
import { ApiService } from './api.service';
import { AgrupamentoContaMensal, ContaMensal, LinhaContaMensal } from '../models/conta-mensal.model';
import { AlertService } from 'src/app/shared/components/alert.service';

@Injectable({ providedIn: 'root' })
export class ContaMensalService {
  constructor(private api: ApiService, private alertService: AlertService) { }

  getGroupingByMonth(yyyymm: string, pesquisaDataCompleta: boolean = false): Promise<any[]> {
    // ajuste endpoint/params conforme seu backend
    return this.api.get<any[]>(`/GetTransactionGroupingByDate/${yyyymm}/${pesquisaDataCompleta}`);
  }

  async BuscarContasMensais(yyyymm: string, pesquisaDataCompleta: boolean = false): Promise<any[]> {
    try {
      const res = await this.api.get<any[]>(`/BuscarContasMensais/${yyyymm}/${pesquisaDataCompleta}`);
      return res;
    } catch (error) {
      // Trate o erro conforme a sua necessidade (ex: logar ou relançar)
      console.error("Erro ao buscar contas mensais:", error);
      // this.alertService.error(error.error.message)
      throw error;
    }
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

  async updateTransaction(payload: any): Promise<any> {
    try {
      const date = new Date(payload.date);
      date.setHours(date.getHours() + 3);
      payload.date = date.toISOString();
      const res = await this.api.put<any>('/UpdateTransaction', payload);;
      return res;
    } catch (error) {
      console.error("Erro ao buscar contas mensais:", error);
      throw error;
    }

  }

  deleteTransaction(id: number): Promise<any> {
    return this.api.delete<any>('/DeleteTransaction', id);
  }
}
