import { ChangeDetectionStrategy, Component, Input, OnChanges } from '@angular/core';
import { TagModule } from 'primeng/tag';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { LancamentoDaConta } from 'src/app/core/models/conta.model';
import { formatCurrencyBR } from 'src/app/core/utils/mask';
import { EmptyStateComponent } from 'src/app/shared/ui/empty-state/empty-state.component';
import { TagDoStatus, tagDoStatus } from 'src/app/views/movimentacao/contas-a-pagar/contas-a-pagar.regras';
import { ResumoLancamentos, lancamentosPorMes, resumoDosLancamentos } from '../contas.regras';

/**
 * Aba Lançamentos do painel da conta (card #22): o que a conta gerou em Contas a Pagar, só para consulta.
 * Quem carrega é o formulário; aqui só se mostra. A tag usa a regra de Contas a Pagar (pendente vencido = ATRASADA).
 */
@Component({
  selector: 'app-conta-lancamentos',
  standalone: true,
  imports: [TagModule, ProgressSpinnerModule, EmptyStateComponent],
  templateUrl: './conta-lancamentos.component.html',
  styleUrls: ['./conta-lancamentos.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ContaLancamentosComponent implements OnChanges {
  @Input() lancamentos: LancamentoDaConta[] = [];
  @Input() carregando = false;
  @Input() erro = false;
  @Input() hoje = new Date();

  resumo: ResumoLancamentos = { pagosNoPrazo: 0, pagosAtrasados: 0, pendentes: 0, aguardando: 0, totalPago: 0 };
  grupos: { mes: string; itens: LancamentoDaConta[] }[] = [];
  tags: Record<number, TagDoStatus> = {};

  ngOnChanges(): void {
    this.resumo = resumoDosLancamentos(this.lancamentos);
    this.grupos = lancamentosPorMes(this.lancamentos);
    this.tags = Object.fromEntries(this.lancamentos.map(l => [l.id, tagDoStatus(l, this.hoje)]));
  }

  moeda(valor: number): string {
    return formatCurrencyBR(valor);
  }

  dia(lancamento: LancamentoDaConta): number {
    return Number(lancamento.data.split('-')[2]);
  }

  contagem(quantidade: number, singular: string, plural: string): string {
    return `${quantidade} ${quantidade === 1 ? singular : plural}`;
  }
}
