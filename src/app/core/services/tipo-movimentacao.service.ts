import { Injectable } from '@angular/core';
import { ApiService } from './api.service';
import { TipoMovimentacaoDto } from '../models/tipo-movimentacao.model';

@Injectable({ providedIn: 'root' })
export class TipoMovimentacaoService {
  constructor(private api: ApiService) {}

  list(): Promise<TipoMovimentacaoDto[]> {
    return this.api.get<TipoMovimentacaoDto[]>('/GetTipoMovimentacao');
  }

  create(dto: Partial<TipoMovimentacaoDto>): Promise<any> {
    return this.api.post<any>('/CreateTipoMovimentacao', dto);
  }

  update(dto: Partial<TipoMovimentacaoDto>): Promise<any> {
    return this.api.put<any>('/UpdateTipoMovimentacao', dto);
  }

  delete(id: number): Promise<any> {
    return this.api.delete<any>('/DeleteTipoMovimentacao', id);
  }
}
