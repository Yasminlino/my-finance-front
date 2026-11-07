import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';
import {
  AplicacaoRegraDto, PreviaRegraDto, PreviaRegraResultadoDto, RegraClassificacaoCreateDto, RegraClassificacaoDto,
  SugestaoCategoriaDto, SugestaoRegraDto
} from '../models/regra-classificacao.model';

/** Regras de classificação (card #76, fase 1). */
@Injectable({ providedIn: 'root' })
export class RegraClassificacaoService {
  constructor(private api: ApiService) { }

  /** Na ordem de prioridade (a de cima vale). */
  listar(): Observable<RegraClassificacaoDto[]> {
    return this.api.get<RegraClassificacaoDto[]>('/GetRegrasClassificacao');
  }

  criar(dto: RegraClassificacaoCreateDto): Observable<RegraClassificacaoDto> {
    return this.api.post<RegraClassificacaoDto>('/CreateRegraClassificacao', dto);
  }

  atualizar(dto: RegraClassificacaoDto): Observable<unknown> {
    return this.api.put('/UpdateRegraClassificacao', dto);
  }

  excluir(id: number): Observable<unknown> {
    return this.api.delete(`/DeleteRegraClassificacao/${id}`);
  }

  /** Prévia ao vivo: quantos lançamentos batem, quantos sem categoria, conflitos e exemplos. */
  previa(dto: PreviaRegraDto): Observable<PreviaRegraResultadoDto> {
    return this.api.post<PreviaRegraResultadoDto>('/GetPreviaRegraClassificacao', dto);
  }

  /** Aplica a regra nos lançamentos sem categoria que batem com ela; devolve quantos e quais mudaram. */
  aplicar(id: number): Observable<AplicacaoRegraDto> {
    return this.api.post<AplicacaoRegraDto>(`/AplicarRegraClassificacao/${id}`, {});
  }

  /** Nova ordem: o primeiro id fica no topo. */
  reordenar(ids: number[]): Observable<unknown> {
    return this.api.put('/ReordenarRegrasClassificacao', ids);
  }

  sugestoes(itemIds: number[]): Observable<SugestaoCategoriaDto[]> {
    return this.api.post<SugestaoCategoriaDto[]>('/GetSugestoesCategoria', itemIds);
  }

  /** "Sugestões do seu extrato": textos repetidos sem categoria que ainda não têm regra. */
  sugestoesDeRegra(): Observable<SugestaoRegraDto[]> {
    return this.api.get<SugestaoRegraDto[]>('/GetSugestoesRegras');
  }
}
