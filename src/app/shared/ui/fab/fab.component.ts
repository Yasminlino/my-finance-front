import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { ButtonModule } from 'primeng/button';

/**
 * Botão flutuante da ação principal no celular (card #27), tirado do "+" de Contas a Pagar.
 * Some a partir de 768px: no desktop a ação fica no mf-page-header.
 */
@Component({
  selector: 'mf-fab',
  standalone: true,
  imports: [ButtonModule],
  template: `
    <p-button [icon]="icone" [rounded]="true" size="large" [ariaLabel]="rotulo" (onClick)="clique.emit()" />
  `,
  styles: [`
    :host {
      position: fixed;
      right: 1rem;
      bottom: 1.25rem;
      z-index: 900;
    }
    :host ::ng-deep .p-button {
      width: 3.5rem;
      height: 3.5rem;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
    }
    @media (min-width: 768px) {
      :host { display: none; }
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class FabComponent {
  @Input() icone = 'pi pi-plus';
  @Input({ required: true }) rotulo!: string;
  @Output() clique = new EventEmitter<void>();
}
