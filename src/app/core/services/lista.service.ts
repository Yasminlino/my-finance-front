import { Injectable } from '@angular/core';
import { ApiService } from './api.service';

export type ListaDto = {
    id: number;
    nome: string;
    tipoMovimentacao: number;
    status: boolean;
};

@Injectable({ providedIn: 'root' })
export class ListaService {
    constructor(private api: ApiService) { }

    list(): Promise<ListaDto[]> {
        return this.api.get<any>('/GetListas').then((r) => r?.data ?? r ?? []);
    }

    GetListaById(id: number): Promise<ListaDto> {
        return this.api.get<ListaDto>('/GetListaById', id);
    }

    create(payload: Partial<ListaDto>): Promise<any> {
        return this.api.post('/CreateLista', payload);
    }

    update(payload: Partial<ListaDto>): Promise<any> {
        return this.api.put('/UpdateLista', { ...payload });
    }

    delete(id: number): Promise<any> {
        return this.api.delete('/DeleteLista', id);
    }
}
