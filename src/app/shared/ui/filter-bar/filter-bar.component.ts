import { ChangeDetectionStrategy, Component } from '@angular/core';
import { ToolbarModule } from 'primeng/toolbar';

/**
 * Barra de filtros acima da tabela (card #27), tirada da de Contas a Pagar: o conteúdo com `inicio` (situação)
 * fica à esquerda; o com `fim` (busca, filtros, limpar, exportar) à direita. Os grupos quebram linha se faltar espaço.
 */
@Component({
  selector: 'mf-filter-bar',
  standalone: true,
  imports: [ToolbarModule],
  template: `
    <p-toolbar styleClass="mf-filter-bar border-none border-bottom-1 surface-border border-noround">
      <div class="mf-filter-bar__inicio p-toolbar-group-start flex-wrap gap-2"><ng-content select="[inicio]" /></div>
      <div class="mf-filter-bar__fim p-toolbar-group-end flex-wrap gap-2"><ng-content select="[fim]" /></div>
    </p-toolbar>
  `,
  styles: [`
    :host ::ng-deep .mf-filter-bar {
      background: transparent;
      padding: 0.75rem 1rem;
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class FilterBarComponent {}
