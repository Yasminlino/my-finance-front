import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { NgClass } from '@angular/common';
import { CardModule } from 'primeng/card';

export type TomStatCard = 'receita' | 'despesa' | 'info' | 'perigo' | 'neutro';

/**
 * Card de resumo (card #27), tirado dos cards do topo de Contas a Pagar: ícone colorido, rótulo, valor e, abaixo
 * dele, o conteúdo de cada card (contagem, barra de progresso…). `destaque` liga a borda vermelha à esquerda.
 */
@Component({
  selector: 'mf-stat-card',
  standalone: true,
  imports: [CardModule, NgClass],
  template: `
    <p-card [styleClass]="'mf-stat-card h-full' + (destaque ? ' mf-stat-card--destaque' : '')">
      <div class="flex align-items-start gap-3">
        <span class="mf-stat-card__icone" [ngClass]="'mf-stat-card__icone--' + tom"><i [class]="icone"></i></span>
        <div class="flex-grow-1 min-w-0">
          <div class="mf-stat-card__rotulo text-color-secondary text-sm">{{ rotulo }}</div>
          <div class="mf-stat-card__valor mf-valor font-bold text-2xl"
            [ngClass]="corDoValor ? 'mf-stat-card__valor--' + corDoValor : ''">{{ valor }}</div>
          <ng-content />
        </div>
      </div>
    </p-card>
  `,
  styles: [`
    .mf-stat-card__icone {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      width: 2.75rem;
      height: 2.75rem;
      border-radius: var(--border-radius);
      font-size: 1.15rem;
    }
    .mf-stat-card__icone--receita { background: var(--green-100); color: var(--green-700); }
    .mf-stat-card__icone--despesa { background: var(--orange-100); color: var(--orange-700); }
    .mf-stat-card__icone--info { background: var(--blue-100); color: var(--blue-700); }
    .mf-stat-card__icone--perigo { background: var(--red-100); color: var(--red-600); }
    .mf-stat-card__icone--neutro { background: var(--surface-200); color: var(--text-color-secondary); }
    .mf-stat-card__valor--receita { color: var(--mf-receita); }
    .mf-stat-card__valor--perigo { color: var(--red-500); }
    :host ::ng-deep .mf-stat-card .p-card-body { padding: 1rem; }
    :host ::ng-deep .mf-stat-card .p-card-content { padding: 0; }
    :host ::ng-deep .mf-stat-card--destaque { border-left: 4px solid var(--red-500); }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class StatCardComponent {
  @Input({ required: true }) rotulo!: string;
  /** Já formatado (ex.: formatCurrencyBR). */
  @Input({ required: true }) valor!: string;
  @Input({ required: true }) icone!: string;
  @Input() tom: TomStatCard = 'neutro';
  @Input() corDoValor: 'receita' | 'perigo' | null = null;
  @Input() destaque = false;
}
