import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { ApiService } from './api.service';

export interface ExtratoBancarioDto {
  id: number;              // ou string | number se tiver manual
  dataImportacao: string;
  dataInicioPeriodo: string;
  dataFimPeriodo: string;
  
  bancoId: number;
    bancoNome: string;
  tipoCartaoId: number;
  nomeArquivoOrigem: string;

  quantidadeLancamentos: number;

  valorTotal: number;
  situacao: string;
}

@Injectable({ providedIn: 'root' })
export class ExtratoBancarioService {
  constructor(private api: ApiService) { }

  listExtratos(monthFilter: string, bancoId?: number | null): Promise<ExtratoBancarioDto[]> {
    return this.api.get<ExtratoBancarioDto[]>('/GetExtratoBancario?month=' + monthFilter);
  }

  createExtratoManualItem(payload: any) {
    return this.api.post('/CreateExtratoBancarioItem', payload);
  }

  updateExtratoItem(payload: any): Promise<any> {
    return this.api.put('/UpdateExtratoBancarioItem', { ...payload});
  }

  deleteExtrato(id: number): Promise<any> {
    return this.api.delete('/DeleteExtratoBancario', id);
  }
}