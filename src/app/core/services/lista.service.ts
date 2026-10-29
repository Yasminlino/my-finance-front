import { Injectable } from '@angular/core';
import { Observable, map } from 'rxjs';
import { ApiService } from './api.service';
import { ComparacaoListasDto, DuplicarListaDto, ListaDto } from '../models/lista.model';

/** Listas com campos configuráveis (card #67). Arquivar é a forma de guardar; excluir apaga a lista e os itens. */
@Injectable({ providedIn: 'root' })
export class ListaService {
    constructor(private api: ApiService) { }

    /** Com o resumo de cada lista. `arquivadas` = pasta Arquivadas. */
    listar(arquivadas = false): Observable<ListaDto[]> {
        return this.api.get<ListaDto[]>('/listas', undefined, { params: { arquivadas } }).pipe(map(r => r ?? []));
    }

    obterPorId(id: number): Observable<ListaDto> {
        return this.api.get<ListaDto>('/listas', id);
    }

    /** 201 com a lista criada. */
    criar(dto: Partial<ListaDto>): Observable<ListaDto> {
        return this.api.post<ListaDto>('/listas', dto);
    }

    atualizar(dto: Partial<ListaDto> & { id: number }): Observable<ListaDto> {
        return this.api.put<ListaDto>(`/listas/${dto.id}`, dto);
    }

    excluir(id: number): Observable<unknown> {
        return this.api.delete('/listas', id);
    }

    arquivar(id: number): Observable<unknown> {
        return this.api.post(`/listas/${id}/arquivar`, null);
    }

    desarquivar(id: number): Observable<unknown> {
        return this.api.post(`/listas/${id}/desarquivar`, null);
    }

    /** 201 com a cópia, na mesma série. Sem nome: "<nome> (cópia)"; sem opções, copia itens e valores e não arquiva. */
    duplicar(id: number, opcoes: DuplicarListaDto = {}): Observable<ListaDto> {
        return this.api.post<ListaDto>(`/listas/${id}/duplicar`, opcoes);
    }

    /** Listas da série (arquivadas inclusive), em ordem de criação. */
    serie(id: number): Observable<ListaDto[]> {
        return this.api.get<ListaDto[]>(`/listas/${id}/serie`).pipe(map(r => r ?? []));
    }

    /** Liga a lista à série de outra; sem `comListaId`, ela sai para uma série própria. */
    definirSerie(id: number, comListaId: number | null): Observable<unknown> {
        return this.api.put(`/listas/${id}/serie`, { comListaId });
    }

    /** Compara a lista (atual) com `com` (anterior; sem ela, a anterior da série). */
    comparar(id: number, com?: number, base: 'estimado' | 'ok' = 'estimado'): Observable<ComparacaoListasDto> {
        return this.api.get<ComparacaoListasDto>(`/listas/${id}/comparar`, undefined, { params: { com, base } });
    }
}
