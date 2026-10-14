import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';
import { TipoMovimentacaoDto } from '../models/tipo-movimentacao.model';

@Injectable({ providedIn: 'root' })
export class TipoMovimentacaoService {
  constructor(private api: ApiService) {}

  listar(): Observable<TipoMovimentacaoDto[]> {
    return this.api.get<TipoMovimentacaoDto[]>('/GetTipoMovimentacao');
  }

  criar(dto: Partial<TipoMovimentacaoDto>): Observable<unknown> {
    return this.api.post('/CreateTipoMovimentacao', dto);
  }

  atualizar(dto: Partial<TipoMovimentacaoDto>): Observable<unknown> {
    return this.api.put('/UpdateTipoMovimentacao', dto);
  }

  excluir(id: number): Observable<unknown> {
    return this.api.delete('/DeleteTipoMovimentacao', id);
  }
}
