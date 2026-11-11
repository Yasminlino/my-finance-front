import { Component, Input } from '@angular/core';
import { requisitosSenha } from '../../acesso.regras';

/** Os requisitos da senha marcando ✓ enquanto a pessoa digita (card #50). */
@Component({
  selector: 'app-requisitos-senha',
  standalone: true,
  template: `
    <ul class="requisitos" aria-live="polite">
      @for (item of itens; track item.texto) {
        <li [class.ok]="item.ok">
          <i class="pi" [class.pi-check-circle]="item.ok" [class.pi-circle]="!item.ok"></i>{{ item.texto }}
        </li>
      }
    </ul>
  `,
  styles: [`
    .requisitos { display: flex; flex-wrap: wrap; gap: 0.25rem 1rem; margin: 0; padding: 0; list-style: none; font-size: 0.85rem; color: var(--text-color-secondary); }
    li { display: flex; align-items: center; gap: 0.375rem; }
    li.ok { color: var(--mf-receita); }
  `]
})
export class RequisitosSenhaComponent {
  @Input() senha: string | null | undefined = '';

  get itens() {
    const r = requisitosSenha(this.senha);
    return [
      { texto: '8 caracteres', ok: r.tamanho },
      { texto: 'uma letra', ok: r.letra },
      { texto: 'um número', ok: r.numero },
    ];
  }
}
