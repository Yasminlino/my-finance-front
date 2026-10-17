import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';
import { ExtratoItemDto } from '../models/extrato.model';

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

  criar(dto: ExtratoItemDto): Observable<unknown> {
    return this.api.post('/CreateExtratoBancarioItem', dto);
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
