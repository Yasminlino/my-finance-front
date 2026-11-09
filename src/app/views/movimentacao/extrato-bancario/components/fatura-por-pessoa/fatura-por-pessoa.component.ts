import { Component, EventEmitter, Input, Output } from '@angular/core';
import { ButtonModule } from 'primeng/button';
import { formatCurrencyBR } from 'src/app/core/utils/mask';
import { FaturaPorPessoa } from '../../extrato.regras';

/** Cores das partes da barra (as pessoas repetem a paleta depois da quinta). */
const CORES = ['var(--blue-400)', 'var(--orange-400)', 'var(--teal-400)', 'var(--purple-400)', 'var(--pink-400)'];

/**
 * Card "Fatura dividida por pessoa" (card #45, parte 3): na aba Lançamentos, com um cartão escolhido, quanto da fatura
 * é meu e quanto é de cada pessoa dos acertos, o já devolvido e o que falta receber. Só desenha; a tela calcula.
 */
@Component({
  selector: 'app-fatura-por-pessoa',
  standalone: true,
  imports: [ButtonModule],
  template: `
    @if (movel) {
      <!-- Celular: total, o que falta receber, a barra e minhas x de outras pessoas; toca e vai para os Acertos -->
      <button type="button" class="fatura fatura--movel surface-card border-round shadow-1 p-3" (click)="verAcertos.emit()">
        <span class="flex justify-content-between align-items-baseline text-sm">
          <span class="mf-hint">Fatura{{ conta ? ' ' + conta : '' }}{{ vence ? ' · vence ' + vence : '' }}</span>
          @if (falta) { <span class="fatura-falta">falta receber {{ moeda(falta) }}</span> }
        </span>
        <strong class="fatura-total">{{ moeda(fatura.total) }}</strong>
        <span class="fatura-barra my-2">
          <span class="fatura-barra__parte fatura-barra__parte--minhas" [style.width]="pct(fatura.minhas)"></span>
          @for (p of fatura.porPessoa; track p.pessoaId; let i = $index) {
            <span class="fatura-barra__parte" [style.width]="pct(p.valor)" [style.background]="cor(i)"></span>
          }
        </span>
        <span class="flex justify-content-between text-sm">
          <span>Minhas <strong>{{ moeda(fatura.minhas) }}</strong></span><span>De outras pessoas <strong>{{ moeda(fatura.outras) }}</strong></span>
        </span>
      </button>
    } @else {
    <div class="fatura surface-card border-round shadow-1 p-3">
      <div class="flex justify-content-between align-items-baseline mb-2">
        <span class="font-semibold">Fatura dividida por pessoa</span>
        <small class="mf-hint">{{ moeda(fatura.total) }}</small>
      </div>
      <div class="fatura-barra mb-2" role="img" [attr.aria-label]="'Minhas compras ' + moeda(fatura.minhas) + ', de outras pessoas ' + moeda(fatura.outras)">
        <span class="fatura-barra__parte fatura-barra__parte--minhas" [style.width]="pct(fatura.minhas)"></span>
        @for (p of fatura.porPessoa; track p.pessoaId; let i = $index) {
          <span class="fatura-barra__parte" [style.width]="pct(p.valor)" [style.background]="cor(i)"></span>
        }
      </div>
      <div class="flex flex-column gap-1 text-sm">
        <div class="flex justify-content-between">
          <span><i class="fatura-ponto fatura-ponto--minhas"></i>Minhas compras</span><span>{{ moeda(fatura.minhas) }}</span>
        </div>
        @for (p of fatura.porPessoa; track p.pessoaId; let i = $index) {
          <div class="flex justify-content-between">
            <span class="min-w-0 white-space-nowrap overflow-hidden text-overflow-ellipsis"><i class="fatura-ponto" [style.background]="cor(i)"></i>{{ p.nome }}</span>
            <span>{{ moeda(p.valor) }}</span>
          </div>
        }
        @if (devolvido !== null) {
          <div class="flex justify-content-between mt-2 pt-2 fatura-divisa">
            <span class="mf-hint">Já devolvido</span><span class="fatura-receita">{{ moeda(devolvido) }}</span>
          </div>
        }
        @if (falta !== null) {
          <div class="flex justify-content-between font-semibold"><span>Falta receber</span><span>{{ moeda(falta) }}</span></div>
        }
      </div>
      <p-button label="Ver acertos" icon="pi pi-arrow-right" iconPos="right" [text]="true" size="small" styleClass="w-full mt-2"
        (onClick)="verAcertos.emit()" />
    </div>
    }
  `,
  styles: [`
    .fatura-barra { display: flex; height: 0.6rem; border-radius: 1rem; overflow: hidden; background: var(--surface-200); }
    .fatura-barra__parte { display: block; height: 100%; }
    .fatura-barra__parte--minhas, .fatura-ponto--minhas { background: var(--surface-400); }
    .fatura-ponto { display: inline-block; width: 0.6rem; height: 0.6rem; border-radius: 50%; margin-right: 0.4rem; }
    .fatura-divisa { border-top: 1px solid var(--surface-border); }
    .fatura-receita { color: var(--mf-receita); }
    .fatura--movel { display: flex; flex-direction: column; width: 100%; border: 0; font: inherit; color: inherit; text-align: left; cursor: pointer; }
    .fatura-total { font-size: 1.5rem; }
    .fatura-falta { color: var(--mf-despesa); font-weight: 600; }
  `]
})
export class FaturaPorPessoaComponent {
  @Input({ required: true }) fatura!: FaturaPorPessoa;
  /** Do card dos Acertos daquele cartão e mês; null enquanto carrega. */
  @Input() devolvido: number | null = null;
  @Input() falta: number | null = null;
  @Input() movel = false;
  /** Nome do cartão, no título do celular. */
  @Input() conta = '';
  /** "10/11"; vazio se o cartão não tem o dia cadastrado. */
  @Input() vence = '';
  @Output() verAcertos = new EventEmitter<void>();

  moeda(v: number): string {
    return formatCurrencyBR(v);
  }

  pct(v: number): string {
    return this.fatura.total > 0 ? `${Math.round((v / this.fatura.total) * 1000) / 10}%` : '0%';
  }

  cor(i: number): string {
    return CORES[i % CORES.length];
  }
}
