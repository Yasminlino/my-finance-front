import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { formatCurrencyBR } from 'src/app/core/utils/mask';
import { ContaDoMes } from '../../extrato.regras';

/**
 * Contas e cartões à esquerda do Extrato (card #45): "Todas as contas" e uma linha por banco, com entradas e saídas do
 * mês. Clicar escolhe a conta; a tela filtra o resto por ela.
 */
@Component({
  selector: 'app-extrato-contas',
  standalone: true,
  template: `
    @if (compacto) {
      <!-- Celular (item 4): chips roláveis; o chip escolhido mostra o saldo do mês da conta -->
      <nav class="extrato-chips" aria-label="Contas e cartões">
        <button type="button" class="extrato-chip" [class.extrato-chip--ativo]="selecionada === null" [attr.aria-pressed]="selecionada === null"
          (click)="selecionar.emit(null)">
          <i class="pi pi-th-large"></i> Todas
        </button>
        @for (conta of contas; track conta.bancoId) {
          <button type="button" class="extrato-chip" [class.extrato-chip--ativo]="selecionada === conta.bancoId"
            [attr.aria-pressed]="selecionada === conta.bancoId" (click)="selecionar.emit(conta.bancoId)">
            <i [class]="conta.ehCredito ? 'pi pi-credit-card' : 'pi pi-building-columns'"></i> {{ conta.nome }}
          </button>
        }
      </nav>
    } @else {
    <nav class="surface-card border-round shadow-1 p-2 flex flex-column gap-1" aria-label="Contas e cartões">
      <button type="button" class="extrato-conta" [class.extrato-conta--ativa]="selecionada === null" (click)="selecionar.emit(null)">
        <span class="extrato-conta__icone"><i class="pi pi-th-large"></i></span>
        <span class="flex-grow-1 min-w-0 text-left">
          <span class="block font-semibold">Todas as contas</span>
          <small class="mf-hint">{{ quantidade(todas) }}</small>
        </span>
        <span class="text-right text-sm white-space-nowrap">
          <span class="block mf-receita-texto">+ {{ moeda(todas.entradas) }}</span>
          <span class="block">{{ moeda(todas.saidas) }}</span>
        </span>
      </button>
      @for (conta of contas; track conta.bancoId) {
        <button type="button" class="extrato-conta" [class.extrato-conta--ativa]="selecionada === conta.bancoId"
          (click)="selecionar.emit(conta.bancoId)">
          <span class="extrato-conta__icone"><i [class]="conta.ehCredito ? 'pi pi-credit-card' : 'pi pi-building-columns'"></i></span>
          <span class="flex-grow-1 min-w-0 text-left">
            <span class="block font-semibold white-space-nowrap overflow-hidden text-overflow-ellipsis">{{ conta.nome }}</span>
            <small class="mf-hint">{{ conta.tipoNome || 'Sem tipo' }} · {{ quantidade(conta) }}</small>
          </span>
          <span class="text-right text-sm white-space-nowrap">
            @if (conta.entradas) { <span class="block mf-receita-texto">+ {{ moeda(conta.entradas) }}</span> }
            <span class="block">{{ moeda(conta.saidas) }}</span>
          </span>
        </button>
      }
    </nav>
    }
  `,
  styles: [`
    .extrato-conta {
      display: flex; align-items: center; gap: 0.6rem; width: 100%; padding: 0.6rem; border: 0;
      border-radius: var(--border-radius); background: transparent; color: var(--text-color); cursor: pointer;
      font: inherit;
    }
    .extrato-conta:hover { background: var(--surface-hover); }
    .extrato-conta--ativa { background: var(--highlight-bg); color: var(--highlight-text-color); }
    .extrato-conta__icone {
      display: inline-flex; align-items: center; justify-content: center; flex-shrink: 0; width: 2.25rem; height: 2.25rem;
      border-radius: var(--border-radius); background: var(--surface-100); color: var(--text-color-secondary);
    }
    .mf-receita-texto { color: var(--mf-receita); }
    .extrato-chips { display: flex; gap: 0.5rem; overflow-x: auto; padding-bottom: 0.25rem; scrollbar-width: none; }
    .extrato-chips::-webkit-scrollbar { display: none; }
    .extrato-chip {
      display: inline-flex; align-items: center; gap: 0.4rem; flex: 0 0 auto; padding: 0.45rem 0.85rem; border-radius: 2rem;
      border: 1px solid var(--surface-border); background: var(--surface-card); color: var(--text-color); font: inherit;
      font-size: 0.875rem; white-space: nowrap; cursor: pointer;
    }
    .extrato-chip--ativo { background: var(--highlight-bg); color: var(--highlight-text-color); border-color: transparent; font-weight: 600; }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ExtratoContasComponent {
  @Input() contas: ContaDoMes[] = [];
  /** null = Todas as contas. */
  @Input() selecionada: number | null = null;
  /** Celular: chips roláveis no lugar da lista. */
  @Input() compacto = false;
  @Output() selecionar = new EventEmitter<number | null>();

  get todas(): Pick<ContaDoMes, 'entradas' | 'saidas' | 'quantidade'> {
    const soma = (campo: 'entradas' | 'saidas' | 'quantidade') => this.contas.reduce((s, c) => s + c[campo], 0);
    return { entradas: Math.round(soma('entradas') * 100) / 100, saidas: Math.round(soma('saidas') * 100) / 100, quantidade: soma('quantidade') };
  }

  moeda(valor: number): string {
    return formatCurrencyBR(valor);
  }

  quantidade(conta: { quantidade: number }): string {
    return conta.quantidade === 1 ? '1 lançamento' : `${conta.quantidade} lançamentos`;
  }
}
