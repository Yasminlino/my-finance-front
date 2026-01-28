import { Injectable } from '@angular/core';
import { ApiService } from './api.service';

export type TipoCartaoDto = {
  id: number;
  nomeTipoCartao: string;
  ativo?: boolean; // se existir no backend
};

export type TipoCartaoCreateUpdateDto = {
  id?: number;
  nomeTipoCartao: string;
  ativo?: boolean;
};

export type TipoCartao = { id: number; nomeTipoCartao: string };

@Injectable({ providedIn: 'root' })
export class TipoCartaoService {
  constructor(private api: ApiService) {}

  list(): Promise<TipoCartaoDto[]> {
    return this.api.get<TipoCartaoDto[]>('/GetTipoCartao');
  }

  create(dto: TipoCartaoCreateUpdateDto): Promise<any> {
    return this.api.post('/CreateTipoCartao', dto);
  }

  update(dto: TipoCartaoCreateUpdateDto): Promise<any> {
    return this.api.put('/UpdateTipoCartao', dto);
  }

  delete(id: number): Promise<any> {
    return this.api.delete('/DeleteTipoCartao',id);
  }
}
