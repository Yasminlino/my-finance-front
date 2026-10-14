import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';
import { BancoCreateUpdateDto, BancoDto } from '../models/banco.model';

@Injectable({ providedIn: 'root' })
export class BancoService {
  constructor(private api: ApiService) { }

  listar(): Observable<BancoDto[]> {
    return this.api.get<BancoDto[]>('/GetBancos');
  }

  obterPorId(id: number): Observable<BancoDto> {
    return this.api.get<BancoDto>('/GetBancoById', id);
  }

  criar(dto: BancoCreateUpdateDto): Observable<unknown> {
    return this.api.post('/CreateBanco', dto);
  }

  atualizar(dto: BancoCreateUpdateDto): Observable<unknown> {
    return this.api.put('/UpdateBanco', dto);
  }

  excluir(id: number): Observable<unknown> {
    return this.api.delete('/DeleteBanco', id);
  }
}
