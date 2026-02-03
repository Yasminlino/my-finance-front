import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { ApiService } from './api.service';

export interface ExtratoItemDto {
  id?: number | string;
  dataMovimentacao?: string;
  valor?: number;

  tipoLancamento?: string;
  descricao?: string;
  observacao?: string;
  descricaoManual?: string;
  nomePessoaTransacao?: string;

  bancoId?: number;
  bancoNome?: string;
  tipoCartaoId?: number;
  tipoCartaoNome?: string;

  categoriaId?: number;
  categoriaNome?: string;

  // cartão
  numeroParcela?: number;
  totalParcelas?: number;
  numeroFatura?: string;
}

@Injectable({ providedIn: 'root' })
export class ExtratoBancarioService {
  constructor(private api: ApiService) {}

  listExtratos( monthFilter: string, bancoId?: number | null ) : Promise<ExtratoItemDto[]>  {
      return this.api.get<ExtratoItemDto[]>('/GetExtratoBancarioItensByMonth?month=' + monthFilter);
  }

  createExtratoManualItem(payload: any) {
    return this.api.post('/CreateExtratoBancarioItem', payload);
  }

  importExtrato(file: File, bancoInfo: { id: number; nomeBanco: string; tipoCartaoId?: number | null }) {
    const form = new FormData();
    form.append('file', file);
    form.append('bancoId', String(bancoInfo.id));
    form.append('nomeBanco', bancoInfo.nomeBanco ?? '');
    if (bancoInfo.tipoCartaoId != null) form.append('tipoCartaoId', String(bancoInfo.tipoCartaoId));

    // ajuste endpoint:
    return this.api.post('/ImportExtrato', form);
  }
}