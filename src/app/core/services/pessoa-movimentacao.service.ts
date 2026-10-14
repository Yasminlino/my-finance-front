import { Injectable } from '@angular/core';
import { Observable, map } from 'rxjs';
import { ApiService } from './api.service';
import { PessoaMovimentacaoDto } from '../models/pessoa-movimentacao.model';

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
}
