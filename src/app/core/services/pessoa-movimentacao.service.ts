import { Injectable } from '@angular/core';
import { Observable, map } from 'rxjs';
import { ApiService } from './api.service';
import { PessoaMovimentacaoDto } from '../models/pessoa-movimentacao.model';

/** Pessoas que usam os cartões (card #79): cadastradas à mão; o nome do extrato não é pessoa. */
@Injectable({ providedIn: 'root' })
export class PessoaMovimentacaoService {
    constructor(private api: ApiService) { }

    listar(): Observable<PessoaMovimentacaoDto[]> {
        return this.api.get<PessoaMovimentacaoDto[]>('/GetPessoaMovimentacao').pipe(map(r => r ?? []));
    }

    obterPorId(id: number): Observable<PessoaMovimentacaoDto> {
        return this.api.get<PessoaMovimentacaoDto>('/GetPessoaMovimentacaoById', id);
    }

    /** Devolve a pessoa criada (ou a que já tinha esse nome). */
    criar(dto: Partial<PessoaMovimentacaoDto>): Observable<PessoaMovimentacaoDto> {
        return this.api.post<PessoaMovimentacaoDto>('/CreatePessoaMovimentacao', dto);
    }

    atualizar(dto: Partial<PessoaMovimentacaoDto>): Observable<unknown> {
        return this.api.put('/UpdatePessoaMovimentacao', dto);
    }

    excluir(id: number): Observable<unknown> {
        return this.api.delete('/DeletePessoaMovimentacao', id);
    }
}
