import { Injectable } from '@angular/core';
import { ApiService } from './api.service';
import { Time } from '@angular/common';

export type ItemListaDto = {
    id: number;
    listaId?: number;
    descricao?: string;
    quantidade?: number;
    status?: string;
    valor?: number;
    dataTarefa?: Date;
    horarioTarefa?: Time;
};

@Injectable({ providedIn: 'root' })
export class ItemListaService {
    constructor(private api: ApiService) { }

    list(): Promise<ItemListaDto[]> {
        return this.api.get<ItemListaDto[]>('/GetItemListas');
    }


    GetItemListaById(id: number): Promise<ItemListaDto[]> {
        return this.api.get<ItemListaDto[]>('/GetItemListaById', id);
    }

    create(payload: Partial<ItemListaDto>): Promise<any> {
        return this.api.post('/CreateItemLista', payload);
    }

    update(payload: Partial<ItemListaDto>): Promise<any> {
        return this.api.put('/UpdateItemLista', { ...payload });
    }

    delete(id: number): Promise<any> {
        return this.api.delete('/DeleteItemLista', id);
    }
}
