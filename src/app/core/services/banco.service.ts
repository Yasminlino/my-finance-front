import { Injectable } from '@angular/core';
import { ApiService } from './api.service';

export type BancoDto = {
  id: number;
  nomeBanco: string;
  saldoInicial: number;
  ativo: boolean;
  tipoCartaoId?: number | null; 
  tipoCartao?: {
    id: number,
    nomeTipoCartao: string,
  } | null;
};

export type BancoCreateUpdateDto = {
  id: number;
  nomeBanco: string;
  saldoInicial: number;
  tipoCartaoId?: number | null; 
  ativo: boolean;
};


@Injectable({ providedIn: 'root' })
export class BancoService {
  constructor(private api: ApiService) {}

  list(): Promise<BancoDto[]> {
    // ajuste a rota conforme seu backend
    return this.api.get<BancoDto[]>('/GetBancos');
  }

  delete(id: number): Promise<any> {
    // ajuste a rota conforme seu backend
    return this.api.delete('/DeleteBanco', id);
  }

  create(dto: BancoCreateUpdateDto): Promise<any> {
    return this.api.post('/CreateBanco', dto);
  }

  update(dto: BancoCreateUpdateDto): Promise<any> {
    return this.api.put('/UpdateBanco', dto);
  }
}
