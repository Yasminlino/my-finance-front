import { Component, EventEmitter, Input, OnInit, Output, inject } from '@angular/core';
import { PrimeTemplate } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { ModalComponent, ModalRodapeDirective } from 'src/app/shared/ui/modal/modal.component';
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
  imports: [PrimeTemplate, ButtonModule, ModalComponent, ModalRodapeDirective],
  template: `
    <!-- Card #80: mf-modal — p-dialog no desktop, tela cheia no celular -->
    <mf-modal titulo="Nota fiscal" icone="pi pi-receipt" tipo="tela" tamanhoDesktop="sm" (fechar)="fechado.emit(false)">
      @if (nota; as n) {
        <div class="ver-topo">
          <div class="font-semibold">{{ n.estabelecimento }}</div>
          <small class="mf-hint">{{ n.itens.length }} {{ n.itens.length === 1 ? 'item' : 'itens' }}</small>
        </div>
        @for (i of n.itens; track $index) {
          <div class="ver-item">
            <span class="min-w-0">
              <span class="block ver-nome">{{ i.nome }}</span>
              @if (i.quantidade !== 1 || i.categoriaNome) {
                <span class="ver-detalhe">
                  @if (i.quantidade !== 1) { <small class="mf-hint">{{ precoUnitario(i) }}</small> }
                  @if (i.categoriaNome) { <span class="ver-categoria">{{ i.categoriaNome }}</span> }
                </span>
              }
            </span>
            <span class="font-semibold white-space-nowrap">{{ moeda(i.valor) }}</span>
          </div>
        }
        <div class="ver-total"><span>Total</span><span>{{ moeda(n.total) }}</span></div>
      } @else {
        <p class="mf-hint">Carregando…</p>
      }
      <ng-template mfModalRodape>
        <div class="flex justify-content-between align-items-center w-full gap-2">
          <p-button label="Remover" icon="pi pi-trash" severity="danger" [text]="true" size="small" [disabled]="!nota" (onClick)="remover()" />
          <p-button label="Fechar" severity="secondary" [outlined]="true" (onClick)="fechado.emit(false)" />
        </div>
      </ng-template>
    </mf-modal>
  `,
  styles: [`
    .ver-topo { padding-bottom: 0.75rem; }
    .ver-item { display: flex; justify-content: space-between; gap: 0.75rem; padding: 0.6rem 0; border-top: 1px solid var(--surface-border); }
    .ver-nome { overflow-wrap: anywhere; }
    .ver-detalhe { display: flex; flex-wrap: wrap; align-items: center; gap: 0.5rem; margin-top: 0.25rem; }
    .ver-categoria { padding: 0.1rem 0.5rem; border-radius: 1rem; background: var(--surface-ground); font-size: 0.75rem; }
    .ver-total { display: flex; justify-content: space-between; align-items: center; margin-top: 0.5rem; padding: 0.75rem; border-radius: var(--mf-radius); background: var(--surface-ground); font-weight: 700; font-size: 1.1rem; }
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

  /** "2 × R$ 3,79": a nota traz o valor da linha, o unitário sai da divisão. */
  precoUnitario(i: { quantidade: number; valor: number }): string {
    return `${i.quantidade.toLocaleString('pt-BR')} × ${this.moeda(i.valor / i.quantidade)}`;
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
