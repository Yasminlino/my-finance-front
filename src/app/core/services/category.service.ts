import { Injectable } from '@angular/core';
import { ApiService } from './api.service';

export type Category = {
  id: number;
  name: string;
  subCategory: string;
  // status: 'Ativo' | 'Inativo' | string;
};

@Injectable({ providedIn: 'root' })
export class CategoryService {
  constructor(private api: ApiService) {}

  list(): Promise<Category[]> {
     return this.api.get<Category[]>('/GetCategories');
  }

  GetCategoryById(id: number): Promise<Category> {
    return this.api.get<Category>('/GetCategoryById', id);
  }

  create(payload: { name: string; subCategory: string }): Promise<any> {
    return this.api.post('/CreateCategory', payload);
  }

  update(id: number, payload: { name: string; subCategory: string }): Promise<any> {
    return this.api.put('/UpdateCategory', { id, ...payload });
  }

  delete(id: number): Promise<any> {
    return this.api.delete('/DeleteCategory', id);
  }
}
