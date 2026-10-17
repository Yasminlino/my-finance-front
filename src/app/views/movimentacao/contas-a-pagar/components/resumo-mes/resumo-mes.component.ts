import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { CardModule } from 'primeng/card';
import { ProgressBarModule } from 'primeng/progressbar';
import { formatCurrencyBR } from 'src/app/core/utils/mask';
import { ResumoMes } from '../../contas-a-pagar.regras';

/** Cards do topo de Contas a Pagar, calculados sobre o mês inteiro (resumoDoMes). */
@Component({
  selector: 'app-resumo-mes',
  standalone: true,
  imports: [CardModule, ProgressBarModule, DecimalPipe],
  templateUrl: './resumo-mes.component.html',
  styleUrls: ['./resumo-mes.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ResumoMesComponent {
  @Input({ required: true }) resumo!: ResumoMes;
  /** Celular: carrossel com Despesas (+ pago), Vencidas e Receitas. */
  @Input() compacto = false;

  /** Card visível no carrossel, para os pontinhos. */
  slideAtivo = 0;

  aoRolar(evento: Event): void {
    const carrossel = evento.target as HTMLElement;
    const slide = carrossel.firstElementChild as HTMLElement | null;
    if (!slide) return;
    this.slideAtivo = Math.round(carrossel.scrollLeft / (slide.offsetWidth || 1));
  }

  money(v: number) { return formatCurrencyBR(v); }

  lancamentos(n: number): string {
    return n === 1 ? '1 lançamento' : `${n} lançamentos`;
  }
}
