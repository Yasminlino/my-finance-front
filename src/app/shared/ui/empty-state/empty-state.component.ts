import { ChangeDetectionStrategy, Component, Input } from '@angular/core';

/** Estado vazio padrão (card #27): ícone, título, texto opcional e, como conteúdo, a ação (um botão). */
@Component({
  selector: 'mf-empty-state',
  standalone: true,
  template: `
    <div class="mf-empty-state flex flex-column align-items-center text-center gap-2 py-5 px-3">
      <i [class]="icone" class="mf-empty-state__icone"></i>
      <div class="mf-empty-state__titulo font-medium">{{ titulo }}</div>
      @if (texto) {
        <div class="mf-empty-state__texto mf-hint">{{ texto }}</div>
      }
      <ng-content />
    </div>
  `,
  styles: [`
    .mf-empty-state__icone { font-size: 2rem; color: var(--text-color-secondary); }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class EmptyStateComponent {
  @Input() icone = 'pi pi-inbox';
  @Input({ required: true }) titulo!: string;
  @Input() texto?: string;
}
