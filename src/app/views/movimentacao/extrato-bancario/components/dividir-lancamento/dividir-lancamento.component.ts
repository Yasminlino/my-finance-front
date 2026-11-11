import { Component, EventEmitter, Input, OnInit, Output, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { PrimeTemplate } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { ModalComponent, ModalMaisDirective, ModalRodapeDirective } from 'src/app/shared/ui/modal/modal.component';
import { DropdownModule } from 'primeng/dropdown';
import { InputNumberModule } from 'primeng/inputnumber';
import { ExtratoItemDto, ExtratoItemParteDto } from 'src/app/core/models/extrato.model';
import { ExtratoBancarioItemService } from 'src/app/core/services/extrato-bancario-item.service';
import { extrairMensagemErro } from 'src/app/core/utils/http-error';
import { formatCurrencyBR } from 'src/app/core/utils/mask';
import { AlertService } from 'src/app/shared/components/alert.service';

type Opcao = { label: string; value: number };
type Linha = { valor: number | null; categoriaId: number | null; pessoaMovimentacaoId: number | null };

const centavos = (v: number) => Math.round(v * 100) / 100;

/**
 * Dividir um lançamento (card #76, fase 3): cada parte tem valor, categoria e, se quiser, pessoa. A soma tem que bater com
 * o valor; no extrato continua um lançamento só. Parte sem pessoa é do dono; a de quem entra nos acertos aparece lá.
 */
@Component({
  selector: 'app-dividir-lancamento',
  standalone: true,
  imports: [FormsModule, PrimeTemplate, ButtonModule, DropdownModule, InputNumberModule, ModalComponent, ModalMaisDirective, ModalRodapeDirective],
  template: `
    <!-- Card #80: mf-modal — p-dialog no desktop, folha de baixo no celular; no máximo 2 botões no rodapé -->
    <mf-modal titulo="Dividir lançamento" tipo="folha" tamanhoDesktop="md" [ocupado]="salvando" (fechar)="fechado.emit(false)">
      @if (jaDividido) {
        <ng-template mfModalMais>
          <p-button label="Desfazer divisão" icon="pi pi-undo" severity="danger" [text]="true" size="small" [disabled]="salvando" (onClick)="desfazer()" />
        </ng-template>
      }
      <p class="mt-0"><strong>{{ titulo }}</strong> · {{ moeda(item.valor) }}</p>

      @for (l of linhas; track l; let i = $index) {
        <div class="parte" [class.parte--sem-pessoa]="!pessoas.length">
          <p-inputNumber class="parte-valor" styleClass="w-full" inputStyleClass="w-full" mode="currency" currency="BRL" locale="pt-BR" [min]="0"
            placeholder="Valor" [(ngModel)]="l.valor" [ariaLabel]="'Valor da parte ' + (i + 1)" />
          <p-dropdown class="parte-campo" styleClass="w-full" [options]="categorias" optionLabel="label" optionValue="value" [(ngModel)]="l.categoriaId"
            [filter]="true" [showClear]="true" placeholder="Categoria" appendTo="body" [ariaLabel]="'Categoria da parte ' + (i + 1)" />
          <!-- Card #79: pessoa só para quem empresta cartão (lista vazia = não usa pessoas) -->
          @if (pessoas.length) {
            <p-dropdown class="parte-campo" styleClass="w-full" [options]="pessoas" optionLabel="label" optionValue="value" [(ngModel)]="l.pessoaMovimentacaoId"
              [filter]="true" [showClear]="true" placeholder="Minha" appendTo="body" [ariaLabel]="'Pessoa da parte ' + (i + 1)" />
          }
          <p-button icon="pi pi-trash" [rounded]="true" [text]="true" severity="danger" [disabled]="linhas.length <= 2"
            [ariaLabel]="'Remover parte ' + (i + 1)" (onClick)="remover(i)" />
          @if (falta > 0 && !l.valor) {
            <button type="button" class="parte-completar" (click)="completar(l)">Usar o que falta ({{ moeda(falta) }})</button>
          }
        </div>
      }

      <div class="flex align-items-center justify-content-between mt-2">
        <p-button label="Adicionar parte" icon="pi pi-plus" [text]="true" size="small" (onClick)="adicionar()" />
        <span class="dividir-falta" [class.dividir-falta--ok]="falta === 0">
          @if (falta === 0) { <i class="pi pi-check"></i> A soma bate }
          @else if (falta > 0) { Falta distribuir {{ moeda(falta) }} }
          @else { Passou {{ moeda(-falta) }} }
        </span>
      </div>

      <ng-template mfModalRodape>
        <p-button label="Cancelar" severity="secondary" [outlined]="true" [disabled]="salvando" (onClick)="fechado.emit(false)" />
        <p-button label="Salvar" icon="pi pi-check" [loading]="salvando" [disabled]="!podeSalvar" (onClick)="salvar()" />
      </ng-template>
    </mf-modal>
  `,
  styles: [`
    .parte { display: grid; grid-template-columns: 9rem minmax(0, 1fr) minmax(0, 1fr) auto; gap: 0.5rem; align-items: center; margin-bottom: 0.5rem; }
    .parte--sem-pessoa { grid-template-columns: 9rem minmax(0, 1fr) auto; }
    .parte-completar { grid-column: 1 / -1; justify-self: start; padding: 0; border: 0; background: none; font: inherit; font-size: 0.8rem; color: var(--primary-color); cursor: pointer; }
    .dividir-falta { font-weight: 600; color: var(--mf-despesa); }
    .dividir-falta--ok { color: var(--mf-receita); }
    @media (max-width: 767.98px) {
      .parte { grid-template-columns: minmax(0, 1fr) auto; padding-bottom: 0.5rem; border-bottom: 1px solid var(--surface-border); }
      .parte-campo { grid-column: 1 / -1; }
    }
  `]
})
export class DividirLancamentoComponent implements OnInit {
  @Input({ required: true }) item!: ExtratoItemDto;
  @Input() categorias: Opcao[] = [];
  @Input() pessoas: Opcao[] = [];
  /** true = gravou (a tela recarrega). */
  @Output() fechado = new EventEmitter<boolean>();

  private readonly servico = inject(ExtratoBancarioItemService);
  private readonly alertService = inject(AlertService);

  linhas: Linha[] = [];
  salvando = false;

  ngOnInit(): void {
    this.linhas = this.jaDividido
      ? this.item.partes!.map(p => ({ valor: Number(p.valor), categoriaId: p.categoriaId ?? null, pessoaMovimentacaoId: p.pessoaMovimentacaoId ?? null }))
      : [
        { valor: null, categoriaId: this.item.categoriaId ?? null, pessoaMovimentacaoId: this.pessoaDoItemNasOpcoes() },
        { valor: null, categoriaId: null, pessoaMovimentacaoId: null }
      ];
  }

  private pessoaDoItemNasOpcoes(): number | null {
    const id = this.item.pessoaMovimentacaoId ?? null;
    return this.pessoas.some(p => p.value === id) ? id : null;
  }

  get jaDividido(): boolean {
    return !!this.item.partes?.length;
  }

  get titulo(): string {
    return this.item.descricao || this.item.nomePessoaTransacao || 'Lançamento';
  }

  /** Positivo: falta distribuir; negativo: passou do valor. */
  get falta(): number {
    return centavos(Number(this.item.valor) - this.linhas.reduce((s, l) => s + (l.valor ?? 0), 0));
  }

  get podeSalvar(): boolean {
    return this.falta === 0 && this.linhas.length >= 2 && this.linhas.every(l => (l.valor ?? 0) > 0) && !this.salvando;
  }

  moeda(valor: number): string {
    return formatCurrencyBR(valor);
  }

  adicionar(): void {
    this.linhas = [...this.linhas, { valor: null, categoriaId: null, pessoaMovimentacaoId: null }];
  }

  remover(indice: number): void {
    if (this.linhas.length > 2) this.linhas = this.linhas.filter((_, i) => i !== indice);
  }

  completar(linha: Linha): void {
    linha.valor = this.falta;
  }

  salvar(): void {
    if (!this.podeSalvar) return;
    this.gravar(this.linhas.map(l => ({ valor: l.valor!, categoriaId: l.categoriaId, pessoaMovimentacaoId: l.pessoaMovimentacaoId })), 'Lançamento dividido.');
  }

  desfazer(): void {
    this.gravar([], 'Divisão desfeita.');
  }

  private gravar(partes: ExtratoItemParteDto[], mensagem: string): void {
    this.salvando = true;
    this.servico.dividir(this.item.id, partes).subscribe({
      next: () => {
        this.salvando = false;
        this.alertService.success(mensagem);
        this.fechado.emit(true);
      },
      error: e => {
        this.salvando = false;
        this.alertService.error(extrairMensagemErro(e, 'Erro ao salvar a divisão.'));
      }
    });
  }
}
