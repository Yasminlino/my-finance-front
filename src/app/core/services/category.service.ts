import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';
import { CategoriaCreateUpdateDto, CategoriaDto } from '../models/categoria.model';

@Injectable({ providedIn: 'root' })
export class CategoryService {
  constructor(private api: ApiService) {}

  listar(): Observable<CategoriaDto[]> {
    return this.api.get<CategoriaDto[]>('/GetCategories');
  }

  listarAtivas(): Observable<CategoriaDto[]> {
    return this.api.get<CategoriaDto[]>('/GetCategoriasAtivas');
  }

  obterPorId(id: number): Observable<CategoriaDto> {
    return this.api.get<CategoriaDto>('/GetCategoryById', id);
  }

  criar(dto: CategoriaCreateUpdateDto): Observable<unknown> {
    return this.api.post('/CreateCategory', dto);
  }

  atualizar(dto: CategoriaCreateUpdateDto & { id: number }): Observable<unknown> {
    return this.api.put('/UpdateCategory', dto);
  }

  excluir(id: number): Observable<unknown> {
    return this.api.delete('/DeleteCategory', id);
  }
}
