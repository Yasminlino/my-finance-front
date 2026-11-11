import { Injectable } from '@angular/core';
import { Observable, map } from 'rxjs';
import { ApiService } from './api.service';
import {
  ClassificacaoNomesResultadoDto, ClassificarNomeDto, GrupoParecidosDto, NomeExtratoDto
} from '../models/nomes-extrato.model';

/** Card #79 — "Nomes do extrato": classificar o nome que vem no extrato e juntar regras de nomes parecidos. */
@Injectable({ providedIn: 'root' })
export class NomesExtratoService {
  constructor(private api: ApiService) { }

  listar(): Observable<NomeExtratoDto[]> {
    return this.api.get<NomeExtratoDto[]>('/GetNomesExtrato').pipe(map(r => r ?? []));
  }

  /** Cria (ou altera) a regra "nome do extrato é igual a" de cada nome. */
  classificar(itens: ClassificarNomeDto[], aplicarAosImportados: boolean): Observable<ClassificacaoNomesResultadoDto> {
    return this.api.post<ClassificacaoNomesResultadoDto>('/ClassificarNomesExtrato', { itens, aplicarAosImportados });
  }

  grupos(): Observable<GrupoParecidosDto[]> {
    return this.api.get<GrupoParecidosDto[]>('/GetGruposParecidos').pipe(map(r => r ?? []));
  }

  /** Deixa a regra escolhida e apaga as outras do grupo. */
  juntar(regraIds: number[], manterRegraId: number, aplicarAosImportados: boolean): Observable<ClassificacaoNomesResultadoDto> {
    return this.api.post<ClassificacaoNomesResultadoDto>('/JuntarNomesParecidos', { regraIds, manterRegraId, aplicarAosImportados });
  }
}
