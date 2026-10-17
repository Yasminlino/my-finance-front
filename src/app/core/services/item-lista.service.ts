import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';
import { ItemListaDto } from '../models/lista.model';

@Injectable({ providedIn: 'root' })
export class ItemListaService {
    constructor(private api: ApiService) { }

    listar(): Observable<ItemListaDto[]> {
        return this.api.get<ItemListaDto[]>('/GetItemLista');
    }

    /** Itens de uma lista (a rota da API se chama GetItemListaById, mas recebe o id da lista). */
    listarDaLista(listaId: number): Observable<ItemListaDto[]> {
        return this.api.get<ItemListaDto[]>('/GetItemListaById', listaId);
    }

    /** 201 com o item criado (BE-P3-05). */
    criar(dto: Partial<ItemListaDto>): Observable<ItemListaDto> {
        return this.api.post<ItemListaDto>('/CreateItemLista', dto);
    }

    atualizar(dto: Partial<ItemListaDto>): Observable<unknown> {
        return this.api.put('/UpdateItemLista', dto);
    }

    excluir(id: number): Observable<unknown> {
        return this.api.delete('/DeleteItemLista', id);
    }
}
