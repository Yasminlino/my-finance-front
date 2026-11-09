import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';
import { CoberturaImportacoesDto, ExtratoBancarioDto, ImportacaoDto, VinculosImportacaoDto } from '../models/extrato.model';

/** Cabeçalhos das importações de extrato. */
@Injectable({ providedIn: 'root' })
export class ExtratoBancarioService {
  constructor(private api: ApiService) { }

  /** O endpoint só filtra por mês ("YYYY-MM"); não existe filtro por banco. */
  listarDoMes(mes: string): Observable<ExtratoBancarioDto[]> {
    return this.api.get<ExtratoBancarioDto[]>('/GetExtratoBancario', undefined, { params: { month: mes } });
  }

  /** Histórico (card #75); meses null = todo o período. */
  listarImportacoes(meses: number | null): Observable<ImportacaoDto[]> {
    return this.api.get<ImportacaoDto[]>('/GetImportacoes', undefined, meses ? { params: { meses } } : undefined);
  }

  coberturaImportacoes(meses: number): Observable<CoberturaImportacoesDto> {
    return this.api.get<CoberturaImportacoesDto>('/GetCoberturaImportacoes', undefined, { params: { meses } });
  }

  vinculosImportacao(id: number): Observable<VinculosImportacaoDto> {
    return this.api.get<VinculosImportacaoDto>(`/GetVinculosImportacao/${id}`);
  }

  desfazerImportacao(id: number, motivo: string): Observable<unknown> {
    return this.api.post(`/DesfazerImportacao/${id}`, { motivo });
  }

  excluir(id: number): Observable<unknown> {
    return this.api.delete('/DeleteExtratoBancario', id);
  }
}
