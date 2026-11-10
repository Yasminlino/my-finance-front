import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { ApiService } from './api.service';

/** Um resultado da busca rápida (card #72). */
export interface ResultadoBuscaDto {
  tipo: 'planejamento' | 'item' | 'categoria' | 'conta-fixa' | string;
  id: number;
  titulo: string;
  detalhe?: string | null;
  listaId?: number | null;
}

@Injectable({ providedIn: 'root' })
export class BuscaService {
  private readonly api = inject(ApiService);

  /** Planejamentos, itens, categorias e contas fixas; menos de 2 letras volta vazio. */
  buscar(texto: string): Observable<ResultadoBuscaDto[]> {
    return this.api.get<ResultadoBuscaDto[]>('/Buscar', undefined, { params: { q: texto } }).pipe(map(r => r ?? []));
  }
}
