import { Component, EventEmitter, Input, OnInit, Output, inject } from '@angular/core';
import { PrimeTemplate } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { NotaFiscalDto } from 'src/app/core/models/extrato.model';
import { ConfirmacaoService } from 'src/app/core/services/confirmacao.service';
import { ExtratoBancarioItemService } from 'src/app/core/services/extrato-bancario-item.service';
import { extrairMensagemErro } from 'src/app/core/utils/http-error';
import { formatCurrencyBR } from 'src/app/core/utils/mask';
import { AlertService } from 'src/app/shared/components/alert.service';

/** Modal com a nota salva no lançamento (card #76, fase 6). */
@Component({
  selector: 'app-ver-nota',
  standalone: true,
  imports: [PrimeTemplate, ButtonModule, DialogModule],
  template: `
    <p-dialog header="Nota fiscal" [visible]="true" [modal]="true" [draggable]="false" [style]="{ width: '36rem' }"
      [breakpoints]="{ '768px': '96vw' }" (visibleChange)="!$event && fechado.emit(false)">
      @if (nota; as n) {
        <p class="mt-0 font-semibold">{{ n.estabelecimento }}</p>
        @for (i of n.itens; track $index) {
          <div class="ver-item">
            <span class="min-w-0">
              <span class="block ver-nome">{{ i.nome }}</span>
              <small class="mf-hint">{{ i.quantidade !== 1 ? i.quantidade + ' × · ' : '' }}{{ i.categoriaNome || 'Sem categoria' }}</small>
            </span>
            <span class="font-semibold white-space-nowrap">{{ moeda(i.valor) }}</span>
          </div>
        }
        <div class="ver-total"><span>Total</span><span>{{ moeda(n.total) }}</span></div>
      } @else {
        <p class="mf-hint">Carregando…</p>
      }
      <ng-template pTemplate="footer">
        <p-button label="Remover nota" icon="pi pi-trash" severity="danger" [text]="true" [disabled]="!nota" styleClass="mr-auto" (onClick)="remover()" />
        <p-button label="Fechar" severity="secondary" [outlined]="true" (onClick)="fechado.emit(false)" />
      </ng-template>
    </p-dialog>
  `,
  styles: [`
    .ver-item { display: flex; justify-content: space-between; gap: 0.75rem; padding: 0.6rem 0; border-top: 1px solid var(--surface-border); }
    .ver-nome { overflow-wrap: anywhere; }
    .ver-total { display: flex; justify-content: space-between; padding-top: 0.75rem; border-top: 1px solid var(--surface-border); font-weight: 700; font-size: 1.1rem; }
  `]
})
export class VerNotaComponent implements OnInit {
  @Input({ required: true }) itemId!: number;
  /** true = a nota foi removida (a tela recarrega). */
  @Output() fechado = new EventEmitter<boolean>();

  private readonly servico = inject(ExtratoBancarioItemService);
  private readonly confirmacao = inject(ConfirmacaoService);
  private readonly alertService = inject(AlertService);

  nota: NotaFiscalDto | null = null;

  ngOnInit(): void {
    this.servico.obterNota(this.itemId).subscribe({
      next: n => (this.nota = n),
      error: e => {
        this.alertService.error(extrairMensagemErro(e, 'Erro ao abrir a nota.'));
        this.fechado.emit(false);
      }
    });
  }

  moeda(v: number): string {
    return formatCurrencyBR(v);
  }

  async remover(): Promise<void> {
    const ok = await this.confirmacao.confirmar('Remover a nota deste lançamento? A categoria e a divisão continuam como estão.', { titulo: 'Remover nota' });
    if (!ok) return;
    this.servico.removerNota(this.itemId).subscribe({
      next: () => {
        this.alertService.success('Nota removida.');
        this.fechado.emit(true);
      },
      error: e => this.alertService.error(extrairMensagemErro(e, 'Erro ao remover a nota.'))
    });
  }
}
