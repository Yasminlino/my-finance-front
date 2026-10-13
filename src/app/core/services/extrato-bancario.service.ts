import { Injectable } from '@angular/core';
import { ApiService } from './api.service';

export interface ExtratoBancarioDto {
  id: number;              // ou string | number se tiver manual
  dataImportacao: string;
  dataInicioPeriodo: string;
  dataFimPeriodo: string;
  
  bancoId: number;
    bancoNome: string;
  tipoCartaoId: number;
  nomeArquivoOrigem: string;

  quantidadeLancamentos: number;

  valorTotal: number;
  situacao: string;
}

@Injectable({ providedIn: 'root' })
export class ExtratoBancarioService {
  constructor(private api: ApiService) { }

  /** O endpoint só filtra por mês; não existe filtro por banco no /GetExtratoBancario. */
  listExtratos(monthFilter: string): Promise<ExtratoBancarioDto[]> {
    return this.api.get<ExtratoBancarioDto[]>('/GetExtratoBancario?month=' + monthFilter);
  }

  deleteExtrato(id: number): Promise<any> {
    return this.api.delete('/DeleteExtratoBancario', id);
  }
}