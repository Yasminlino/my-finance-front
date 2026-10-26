import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { NgClass } from '@angular/common';
import { classeDaNatureza } from '../natureza';
import { classeDaCor } from '../aparencia';

/**
 * Ícone da categoria num quadrado com a cor da natureza (card #27). Antes cada tela de Contas a Pagar
 * tinha o seu .icone-categoria, com a cor tirada do nome da categoria.
 */
@Component({
  selector: 'mf-category-icon',
  standalone: true,
  imports: [NgClass],
  template: `<span class="mf-icone-categoria" [ngClass]="[classe, 'mf-icone-categoria--' + tamanho]"><i [class]="icone"></i></span>`,
  styles: [`
    :host { display: inline-flex; flex-shrink: 0; }
    .mf-icone-categoria {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      border-radius: var(--border-radius);
    }
    .mf-icone-categoria--md { width: 2.25rem; height: 2.25rem; }
    .mf-icone-categoria--lg { width: 2.5rem; height: 2.5rem; }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CategoryIconComponent {
  @Input() natureza: number | null | undefined = null;
  /** Cor escolhida na categoria (card #23); quando há, vale mais que a da natureza. */
  @Input() cor: string | null | undefined = null;
  @Input() icone = 'pi pi-tag';
  @Input() tamanho: 'md' | 'lg' = 'md';

  get classe(): string {
    return classeDaCor(this.cor) ?? classeDaNatureza(this.natureza);
  }
}
