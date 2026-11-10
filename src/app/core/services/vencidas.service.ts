import { Injectable, computed, inject, signal } from '@angular/core';
import { ContaMensal } from '../models/conta-mensal.model';
import { isoDate } from '../utils/mask';
import { ContaMensalService } from './conta-mensal.service';

/**
 * Contas a pagar vencidas hoje, de todos os meses (card #72): o selo do menu é o tamanho da lista, e Contas a Pagar
 * separa as do mês aberto (resumo) das de meses anteriores (aviso) — a mesma base, então os números fecham.
 * O menu pede de novo a cada troca de tela, e Contas a Pagar pede a cada recarga do mês (inclusive depois de pagar).
 */
@Injectable({ providedIn: 'root' })
export class VencidasService {
  private readonly contaMensalService = inject(ContaMensalService);
  private readonly _contas = signal<ContaMensal[]>([]);
  readonly contas = this._contas.asReadonly();
  readonly quantidade = computed(() => this._contas().length);

  atualizar(): void {
    this.contaMensalService.listarVencidas(isoDate()).subscribe({
      next: contas => this._contas.set(Array.isArray(contas) ? contas : []),
      error: () => { /* mantém a última lista até a próxima troca de tela */ }
    });
  }
}
