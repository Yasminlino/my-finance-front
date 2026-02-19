import { Injectable } from '@angular/core';
import { ApiService } from './api.service';

export type PessoaMovimentacaoDto = {
    id: number;
    nomePessoa: string;
    categoriaId: number | null;
    tipoMovimentacaoId: number | null;
};

export type PessoaMovimentacaoCreateDto = Omit<PessoaMovimentacaoDto, 'id'>;

@Injectable({ providedIn: 'root' })
export class PessoaMovimentacaoService {
    constructor(private api: ApiService) { }


    list(): Promise<PessoaMovimentacaoDto[]> {
        return this.api.get<any>('/GetPessoaMovimentacao').then((r) => r?.data ?? r ?? []);
    }

    GetPessoaMovimentacaoById(id: number): Promise<PessoaMovimentacaoDto> {
        return this.api.get<PessoaMovimentacaoDto>('/GetPessoaMovimentacaoById', id);
    }

    create(payload: Partial<PessoaMovimentacaoDto>): Promise<any> {
        return this.api.post('/CreatePessoaMovimentacao', payload);
    }

    update(id: number, payload: Partial<PessoaMovimentacaoDto>): Promise<any> {
        return this.api.put('/UpdatePessoaMovimentacao', { ...payload });
    }

    delete(id: number): Promise<any> {
        return this.api.delete('/DeletePessoaMovimentacao', id);
    }
}
