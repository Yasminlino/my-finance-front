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

    /** A API responde texto ("ItemLista criada com sucesso!"), não JSON. */
    criar(dto: Partial<ItemListaDto>): Observable<string> {
        return this.api.postTexto('/CreateItemLista', dto);
    }

    atualizar(dto: Partial<ItemListaDto>): Observable<unknown> {
        return this.api.put('/UpdateItemLista', dto);
    }

    excluir(id: number): Observable<unknown> {
        return this.api.delete('/DeleteItemLista', id);
    }
}
