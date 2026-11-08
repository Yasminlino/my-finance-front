import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';
import { ExtratoItemDto, ExtratoItemParteDto } from '../models/extrato.model';
import { AcertosDto, FiltroAcertos } from '../models/acertos.model';

@Injectable({ providedIn: 'root' })
export class ExtratoBancarioItemService {
  constructor(private api: ApiService) { }

  /**
   * Itens do mês ("YYYY-MM"). Cartão de crédito vem pela fatura do mês: a API decide pelo
   * TipoCartao.EhCredito de cada item — o antigo parâmetro `ehCredito` era ignorado (BE-P3-10).
   */
  listarDoMes(mes: string, bancoId?: number | null): Observable<ExtratoItemDto[]> {
    return this.api.get<ExtratoItemDto[]>('/GetExtratoBancarioItensByMonth', undefined, {
      params: { month: mes, bancoId }
    });
  }

  /** Acertos com pessoas (card #45, parte 3). */
  acertos(filtro: FiltroAcertos): Observable<AcertosDto> {
    return this.api.get<AcertosDto>('/GetAcertos', undefined, {
      params: { inicio: filtro.inicio, fim: filtro.fim, bancoId: filtro.bancoId }
    });
  }

  criar(dto: ExtratoItemDto): Observable<unknown> {
    return this.api.post('/CreateExtratoBancarioItem', dto);
  }

  /** Divide o lançamento nestas partes; lista vazia desfaz (card #76, fase 3). */
  dividir(id: number, partes: ExtratoItemParteDto[]): Observable<unknown> {
    return this.api.put(`/DividirExtratoBancarioItem/${id}`, partes);
  }

  atualizar(dto: ExtratoItemDto): Observable<unknown> {
    return this.api.put('/UpdateExtratoBancarioItem', dto);
  }

  importar(arquivo: File, banco: { id: number; nomeBanco: string; tipoCartaoId?: number | null }): Observable<unknown> {
    const form = new FormData();
    form.append('arquivo', arquivo);
    form.append('bancoId', String(banco.id));
    // Opcionais: a API ignora se não usar.
    form.append('nomeBanco', banco.nomeBanco ?? '');
    if (banco.tipoCartaoId != null) {
      form.append('tipoCartaoId', String(banco.tipoCartaoId));
    }

    return this.api.post('/ImportExtratoBancario', form);
  }

  excluir(id: number): Observable<unknown> {
    return this.api.delete('/DeleteExtratoBancarioItem', id);
  }
}
