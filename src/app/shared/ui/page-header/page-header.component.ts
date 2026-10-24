import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { MenuItem } from 'primeng/api';
import { BreadcrumbModule } from 'primeng/breadcrumb';
import { ButtonModule } from 'primeng/button';

/**
 * Cabeçalho das telas (card #27), tirado do de Contas a Pagar: breadcrumb, ‹ voltar, título e subtítulo à
 * esquerda; ações (botões, mês, switch…) à direita, pelo conteúdo com o atributo `acoes`.
 */
@Component({
  selector: 'mf-page-header',
  standalone: true,
  imports: [BreadcrumbModule, ButtonModule],
  template: `
    <div class="mf-page-header flex flex-wrap align-items-end justify-content-between gap-3">
      <div class="flex flex-column gap-1 min-w-0">
        @if (breadcrumb?.length) {
          <p-breadcrumb [model]="breadcrumb" [home]="home" />
        }
        <div class="flex align-items-center gap-1">
          @if (mostrarVoltar) {
            <p-button icon="pi pi-chevron-left" [text]="true" [rounded]="true" severity="secondary" size="small"
              (onClick)="voltar.emit()" ariaLabel="Voltar" />
          }
          <h5 class="mf-page-title">{{ titulo }}</h5>
        </div>
        @if (subtitulo) {
          <small class="mf-page-subtitle">{{ subtitulo }}</small>
        }
      </div>
      <div class="mf-page-header__acoes flex flex-wrap align-items-center gap-2">
        <ng-content select="[acoes]" />
      </div>
    </div>
  `,
  styles: [`
    :host ::ng-deep .p-breadcrumb {
      padding: 0;
      background: transparent;
      border: none;
      font-size: 0.8rem;
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PageHeaderComponent {
  @Input({ required: true }) titulo!: string;
  @Input() subtitulo?: string;
  @Input() breadcrumb?: MenuItem[];
  @Input() home?: MenuItem;
  @Input() mostrarVoltar = false;
  @Output() voltar = new EventEmitter<void>();
}
