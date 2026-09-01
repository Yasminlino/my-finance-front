import { Injectable } from '@angular/core';
import { ApiService } from './api.service';
import { BancoCreateUpdateDto, BancoDto } from '../interfaces/banco.interface';

@Injectable({ providedIn: 'root' })
export class BancoService {
  constructor(private api: ApiService) { }

  list(): Promise<BancoDto[]> {
    // ajuste a rota conforme seu backend
    return this.api.get<BancoDto[]>('/GetBancos');
  }

  getById(id: number): Promise<BancoDto> {
    return this.api.get<BancoDto>('/GetBancoById', id);
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
