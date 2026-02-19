import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { ApiService } from './api.service';

export interface ExtratoItemDto {
  id: number;              // ou string | number se tiver manual
  dataMovimentacao: string;
  valor: number;
  tipoLancamento: string;

  categoriaId?: number | null;
  categoriaNome?: string | null;

  tipoMovimentacaoId?: number | null;      // ✅
  tipoMovimentacaoNome?: string | null; 
  
  descricao?: string;
  observacao?: string;
  descricaoManual?: string;
  nomePessoaTransacao?: string;

  bancoId?: number;
  bancoNome?: string;
  tipoCartaoId?: number;
  tipoCartaoNome?: string;

  // cartão
  parcelaAtual?: number;
  quantidadeParcelas?: number;
  numeroFatura?: string;

  categoria?: { id: number; name: string };
  tipoMovimentacao?: { id: number; nomeTipoMovimentacao: string };
}

@Injectable({ providedIn: 'root' })
export class ExtratoBancarioItemService {
  constructor(private api: ApiService) { }

  listExtratos(monthFilter: string, bancoId?: number | null): Promise<ExtratoItemDto[]> {
    return this.api.get<ExtratoItemDto[]>('/GetExtratoBancarioItensByMonth?month=' + monthFilter);
  }

  createExtratoManualItem(payload: any) {
    return this.api.post('/CreateExtratoBancarioItem', payload);
  }

  updateExtratoItem(payload: any): Promise<any> {
    return this.api.put('/UpdateExtratoBancarioItem', { ...payload});
  }

  importExtrato(
    file: File,
    bancoInfo: { id: number; nomeBanco: string; tipoCartaoId?: number | null }
  ) {
    const form = new FormData();
    form.append('arquivo', file); // 🔥 nome correto
    form.append('bancoId', String(bancoInfo.id));

    // opcionais (ok enviar mesmo se o back ignorar)
    form.append('nomeBanco', bancoInfo.nomeBanco ?? '');
    if (bancoInfo.tipoCartaoId != null) {
      form.append('tipoCartaoId', String(bancoInfo.tipoCartaoId));
    }

    return this.api.post('/ImportExtratoBancario', form);
  }
}