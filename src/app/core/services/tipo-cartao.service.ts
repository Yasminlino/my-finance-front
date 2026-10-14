import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';
import { TipoCartaoCreateUpdateDto, TipoCartaoDto } from '../models/tipo-cartao.model';

@Injectable({ providedIn: 'root' })
export class TipoCartaoService {
  constructor(private api: ApiService) {}

  listar(): Observable<TipoCartaoDto[]> {
    return this.api.get<TipoCartaoDto[]>('/GetTipoCartao');
  }

  criar(dto: TipoCartaoCreateUpdateDto): Observable<unknown> {
    return this.api.post('/CreateTipoCartao', dto);
  }

  atualizar(dto: TipoCartaoCreateUpdateDto): Observable<unknown> {
    return this.api.put('/UpdateTipoCartao', dto);
  }

  excluir(id: number): Observable<unknown> {
    return this.api.delete('/DeleteTipoCartao', id);
  }
}
