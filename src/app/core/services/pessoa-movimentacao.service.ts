import { Injectable } from '@angular/core';
import { Observable, map } from 'rxjs';
import { ApiService } from './api.service';
import { PessoaEstabelecimentoDto, PessoaMovimentacaoDto } from '../models/pessoa-movimentacao.model';

@Injectable({ providedIn: 'root' })
export class PessoaMovimentacaoService {
    constructor(private api: ApiService) { }

    listar(): Observable<PessoaMovimentacaoDto[]> {
        return this.api.get<PessoaMovimentacaoDto[]>('/GetPessoaMovimentacao').pipe(map(r => r ?? []));
    }

    obterPorId(id: number): Observable<PessoaMovimentacaoDto> {
        return this.api.get<PessoaMovimentacaoDto>('/GetPessoaMovimentacaoById', id);
    }

    criar(dto: Partial<PessoaMovimentacaoDto>): Observable<unknown> {
        return this.api.post('/CreatePessoaMovimentacao', dto);
    }

    atualizar(dto: Partial<PessoaMovimentacaoDto>): Observable<unknown> {
        return this.api.put('/UpdatePessoaMovimentacao', dto);
    }

    excluir(id: number): Observable<unknown> {
        return this.api.delete('/DeletePessoaMovimentacao', id);
    }

    /** Card #76, fase 2: pessoas que parecem estabelecimento (fora dos acertos, sem padrão, sem regra). */
    estabelecimentos(): Observable<PessoaEstabelecimentoDto[]> {
        return this.api.get<PessoaEstabelecimentoDto[]>('/GetPessoasEstabelecimento').pipe(map(r => r ?? []));
    }

    /** Apaga as escolhidas (só as que ainda são candidatas); os lançamentos ficam com o nome. Devolve quantas. */
    removerEstabelecimentos(ids: number[]): Observable<number> {
        return this.api.post<{ quantidade: number }>('/RemoverPessoasEstabelecimento', ids).pipe(map(r => r?.quantidade ?? 0));
    }
}
