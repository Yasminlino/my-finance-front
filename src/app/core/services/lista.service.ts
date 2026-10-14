import { Injectable } from '@angular/core';
import { Observable, map } from 'rxjs';
import { ApiService } from './api.service';
import { ListaDto } from '../models/lista.model';

@Injectable({ providedIn: 'root' })
export class ListaService {
    constructor(private api: ApiService) { }

    listar(): Observable<ListaDto[]> {
        return this.api.get<ListaDto[]>('/GetListas').pipe(map(r => r ?? []));
    }

    obterPorId(id: number): Observable<ListaDto> {
        return this.api.get<ListaDto>('/GetListaById', id);
    }

    /** A API responde texto ("Lista criada com sucesso!"), não JSON. */
    criar(dto: Partial<ListaDto>): Observable<string> {
        return this.api.postTexto('/CreateLista', dto);
    }

    atualizar(dto: Partial<ListaDto>): Observable<unknown> {
        return this.api.put('/UpdateLista', dto);
    }

    excluir(id: number): Observable<unknown> {
        return this.api.delete('/DeleteLista', id);
    }
}
