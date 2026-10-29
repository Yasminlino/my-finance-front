import { Injectable } from '@angular/core';
import { Observable, map } from 'rxjs';
import { ApiService } from './api.service';
import { AlterarOcorrenciaDto, ItemListaDto, OcorrenciaDto, ResultadoLoteDto } from '../models/lista.model';

/** Itens sempre pela lista: /listas/{listaId}/itens (card #67). */
@Injectable({ providedIn: 'root' })
export class ItemListaService {
    constructor(private api: ApiService) { }

    private itens(listaId: number): string {
        return `/listas/${listaId}/itens`;
    }

    /** Todos os itens da lista (sem paginação). */
    listarDaLista(listaId: number): Observable<ItemListaDto[]> {
        return this.api.get<ItemListaDto[]>(this.itens(listaId)).pipe(map(r => r ?? []));
    }

    /** 201 com o item criado. */
    criar(listaId: number, dto: Partial<ItemListaDto>): Observable<ItemListaDto> {
        return this.api.post<ItemListaDto>(this.itens(listaId), dto);
    }

    atualizar(listaId: number, dto: Partial<ItemListaDto> & { id: number }): Observable<ItemListaDto> {
        return this.api.put<ItemListaDto>(`${this.itens(listaId)}/${dto.id}`, dto);
    }

    excluir(listaId: number, id: number): Observable<unknown> {
        return this.api.delete(this.itens(listaId), id);
    }

    /** Marca (ou desmarca) vários itens numa requisição só. */
    marcarFeito(listaId: number, ids: number[], feito = true): Observable<ResultadoLoteDto> {
        return this.api.patch<ResultadoLoteDto>(`${this.itens(listaId)}/feito`, { ids, feito });
    }

    desmarcarTodos(listaId: number): Observable<ResultadoLoteDto> {
        return this.api.post<ResultadoLoteDto>(`${this.itens(listaId)}/desmarcar-todos`, null);
    }

    /** Só itens que não repetem (o feito de quem repete é por ocorrência). */
    excluirConcluidos(listaId: number): Observable<ResultadoLoteDto> {
        return this.api.delete<ResultadoLoteDto>(`${this.itens(listaId)}/concluidos`);
    }

    /** Agenda: ocorrências entre `de` e `ate` (yyyy-mm-dd, até 366 dias), repetições expandidas. */
    listarPeriodo(listaId: number, de: string, ate: string): Observable<OcorrenciaDto[]> {
        return this.api.get<OcorrenciaDto[]>(this.itens(listaId), undefined, { params: { de, ate } }).pipe(map(r => r ?? []));
    }

    /** "Só esta" numa ocorrência de item que repete. */
    alterarOcorrencia(listaId: number, itemId: number, dataOriginal: string, dto: AlterarOcorrenciaDto): Observable<unknown> {
        return this.api.put(`${this.itens(listaId)}/${itemId}/ocorrencias/${dataOriginal}`, dto);
    }

    /** "Esta e as próximas": o item passa a valer como `item` a partir de `aPartirDe`. */
    dividir(listaId: number, itemId: number, aPartirDe: string, item: Partial<ItemListaDto>): Observable<ItemListaDto> {
        return this.api.post<ItemListaDto>(`${this.itens(listaId)}/${itemId}/dividir`, { aPartirDe, item });
    }

    /** Exclui esta e as próximas ocorrências (desde a primeira, o item inteiro). */
    encerrar(listaId: number, itemId: number, aPartirDe: string): Observable<unknown> {
        return this.api.delete(`${this.itens(listaId)}/${itemId}/ocorrencias?aPartirDe=${aPartirDe}`);
    }
}
