import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';
import { ExtratoBancarioDto } from '../models/extrato.model';

/** Cabeçalhos das importações de extrato. */
@Injectable({ providedIn: 'root' })
export class ExtratoBancarioService {
  constructor(private api: ApiService) { }

  /** O endpoint só filtra por mês ("YYYY-MM"); não existe filtro por banco. */
  listarDoMes(mes: string): Observable<ExtratoBancarioDto[]> {
    return this.api.get<ExtratoBancarioDto[]>('/GetExtratoBancario', undefined, { params: { month: mes } });
  }

  excluir(id: number): Observable<unknown> {
    return this.api.delete('/DeleteExtratoBancario', id);
  }
}
