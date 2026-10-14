import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';
import { ContaMensal, LinhaContasMensais } from '../models/conta-mensal.model';
import { formatDateInput } from '../utils/mask';

/** Contas do mês (Transactions na API). */
@Injectable({ providedIn: 'root' })
export class ContaMensalService {
  constructor(private api: ApiService) { }

  /** Contas do mês ("YYYY-MM") ou de um dia exato ("YYYY-MM-DD" com diaExato), com conta e categoria. */
  listarDoMes(periodo: string, diaExato = false): Observable<LinhaContasMensais[]> {
    return this.api.get<LinhaContasMensais[]>(`/BuscarContasMensais/${periodo}/${diaExato}`);
  }

  /** Lançamentos do mês ou de um dia exato, sem os dados da conta. */
  listarPorData(periodo: string, diaExato = false): Observable<ContaMensal[]> {
    return this.api.get<ContaMensal[]>(`/GetTransactionByDate/${periodo}/${diaExato}`);
  }

  /** Em aberto com vencimento antes de `dia` ("YYYY-MM-DD"). */
  listarVencidas(dia: string): Observable<ContaMensal[]> {
    return this.api.get<ContaMensal[]>(`/GetContaVencida/${dia}`);
  }

  /**
   * O vencimento é data de calendário na API (DB-P1-02): vai sempre como "YYYY-MM-DD".
   * O form/grid entrega Date à meia-noite local; formatDateInput lê nos getters locais.
   */
  private comDataDeCalendario(dto: any): any {
    return dto?.date ? { ...dto, date: formatDateInput(dto.date) } : dto;
  }

  criar(dto: any): Observable<unknown> {
    return this.api.post('/CreateTransaction', this.comDataDeCalendario(dto));
  }

  atualizar(dto: any): Observable<unknown> {
    return this.api.put('/UpdateTransaction', this.comDataDeCalendario(dto));
  }

  excluir(id: number): Observable<unknown> {
    return this.api.delete('/DeleteTransaction', id);
  }
}
