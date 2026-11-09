import { Component, EventEmitter, Input, OnDestroy, Output, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { PrimeTemplate } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { DropdownModule } from 'primeng/dropdown';
import { InputTextModule } from 'primeng/inputtext';
import { NotaFiscalDto } from 'src/app/core/models/extrato.model';
import { ExtratoBancarioItemService } from 'src/app/core/services/extrato-bancario-item.service';
import { extrairMensagemErro } from 'src/app/core/utils/http-error';
import { formatCurrencyBR } from 'src/app/core/utils/mask';
import { AlertService } from 'src/app/shared/components/alert.service';

type Opcao = { label: string; value: number };
const centavos = (v: number) => Math.round(v * 100) / 100;

/**
 * Lançar a nota de um lançamento (card #76, fase 6): câmera ou link colado. Mostra os itens com a categoria sugerida pelas
 * regras para conferir; ao salvar, a nota fica no lançamento e a API o classifica pelos itens.
 */
@Component({
  selector: 'app-ler-nota',
  standalone: true,
  imports: [FormsModule, PrimeTemplate, ButtonModule, DialogModule, DropdownModule, InputTextModule],
  template: `
    <p-dialog header="Lançar nota" [visible]="true" [modal]="true" [draggable]="false" [style]="{ width: '40rem' }"
      [breakpoints]="{ '768px': '96vw' }" (visibleChange)="!$event && cancelar()">
      @if (nota; as n) {
        <p class="mt-0"><strong>{{ n.estabelecimento }}</strong> · {{ moeda(n.total) }}</p>
        @if (diferenca !== 0) {
          <div class="nota-aviso" role="alert">
            <i class="pi pi-exclamation-triangle"></i>
            <span>A nota dá {{ moeda(n.total) }} e o lançamento é {{ moeda(valorDoLancamento) }}. A nota será salva, mas a categoria do lançamento não muda.</span>
          </div>
        }
        @for (i of n.itens; track $index) {
          <div class="nota-item">
            <span class="nota-nome">{{ i.nome }}@if (i.quantidade !== 1) { <small class="mf-hint">× {{ i.quantidade }}</small> }</span>
            <span class="nota-valor">{{ moeda(i.valor) }}</span>
            <p-dropdown class="nota-categoria" styleClass="w-full" [options]="categorias" optionLabel="label" optionValue="value" [(ngModel)]="i.categoriaId"
              [filter]="true" [showClear]="true" placeholder="Categoria" appendTo="body" [ariaLabel]="'Categoria de ' + i.nome" />
          </div>
        }
      } @else {
        <p class="mt-0 mf-hint">Aponte a câmera para o QR Code da nota ou cole o link que ele abre. Por enquanto, só notas do Paraná.</p>
        @if (lendoCamera) {
          <div id="leitor-nota-qr" class="nota-camera"></div>
          <p-button label="Parar câmera" severity="secondary" [text]="true" size="small" (onClick)="pararCamera()" />
        } @else {
          <p-button label="Ler com a câmera" icon="pi pi-camera" styleClass="w-full mb-3" [disabled]="buscando" (onClick)="abrirCamera()" />
        }
        <div class="flex gap-2 mt-2">
          <input pInputText class="flex-grow-1 min-w-0" placeholder="Colar o link da nota" aria-label="Link da nota" [(ngModel)]="link" [disabled]="buscando" />
          <p-button label="Ler" [loading]="buscando" [disabled]="!link.trim()" (onClick)="ler(link)" />
        </div>
      }
      <ng-template pTemplate="footer">
        <p-button label="Cancelar" severity="secondary" [outlined]="true" (onClick)="cancelar()" />
        @if (nota) {
          <p-button label="Salvar nota" icon="pi pi-check" [loading]="salvando" (onClick)="salvar()" />
        }
      </ng-template>
    </p-dialog>
  `,
  styles: [`
    .nota-aviso { display: flex; gap: 0.5rem; padding: 0.75rem; margin-bottom: 0.75rem; border-radius: var(--mf-radius); background: var(--mf-tag-warning-bg); color: var(--mf-tag-warning-fg); font-size: 0.875rem; }
    .nota-item { display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: 0.35rem 0.75rem; padding: 0.6rem 0; border-top: 1px solid var(--surface-border); }
    .nota-nome { min-width: 0; overflow-wrap: anywhere; }
    .nota-valor { font-weight: 600; white-space: nowrap; }
    .nota-categoria { grid-column: 1 / -1; }
    .nota-camera { width: 100%; max-width: 22rem; margin: 0 auto 0.5rem; }
  `]
})
export class LerNotaComponent implements OnDestroy {
  @Input() categorias: Opcao[] = [];
  @Input({ required: true }) itemId!: number;
  /** Para avisar se a nota não bate com o lançamento. */
  @Input() valorDoLancamento = 0;
  /** true = salvou (a tela recarrega). */
  @Output() concluiu = new EventEmitter<boolean>();

  private readonly servico = inject(ExtratoBancarioItemService);
  private readonly alertService = inject(AlertService);

  nota: NotaFiscalDto | null = null;
  link = '';
  buscando = false;
  salvando = false;
  lendoCamera = false;
  private camera: { stop(): Promise<unknown> } | null = null;

  get diferenca(): number {
    return this.nota ? centavos(this.nota.total - Number(this.valorDoLancamento)) : 0;
  }

  moeda(v: number): string {
    return formatCurrencyBR(v);
  }

  ler(link: string): void {
    this.buscando = true;
    this.servico.lerNota(link.trim()).subscribe({
      next: nota => {
        this.buscando = false;
        this.nota = nota;
      },
      error: e => {
        this.buscando = false;
        this.alertService.error(extrairMensagemErro(e, 'Não consegui ler esta nota.'));
      }
    });
  }

  async abrirCamera(): Promise<void> {
    this.lendoCamera = true;
    // O elemento do leitor só existe depois de redesenhar.
    await new Promise(r => setTimeout(r));
    try {
      const { Html5Qrcode } = await import('html5-qrcode');
      const leitor = new Html5Qrcode('leitor-nota-qr');
      this.camera = leitor;
      await leitor.start({ facingMode: 'environment' }, { fps: 10, qrbox: 240 }, texto => {
        void this.pararCamera();
        this.ler(texto);
      }, () => { /* quadro sem QR: continua procurando */ });
    } catch {
      this.lendoCamera = false;
      this.camera = null;
      this.alertService.error('Não consegui abrir a câmera. Permita o acesso ou cole o link da nota.');
    }
  }

  async pararCamera(): Promise<void> {
    const camera = this.camera;
    this.camera = null;
    this.lendoCamera = false;
    try { await camera?.stop(); } catch { /* já parada */ }
  }

  salvar(): void {
    if (!this.nota || this.salvando) return;
    this.salvando = true;
    this.servico.salvarNota(this.itemId, this.nota).subscribe({
      next: r => {
        this.salvando = false;
        this.alertService.success(r.mensagem);
        this.concluiu.emit(true);
      },
      error: e => {
        this.salvando = false;
        this.alertService.error(extrairMensagemErro(e, 'Erro ao salvar a nota.'));
      }
    });
  }

  cancelar(): void {
    void this.pararCamera();
    this.concluiu.emit(false);
  }

  ngOnDestroy(): void {
    void this.pararCamera();
  }
}
