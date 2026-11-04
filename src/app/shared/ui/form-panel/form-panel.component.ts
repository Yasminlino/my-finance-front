import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { PrimeTemplate } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { InputSwitchModule } from 'primeng/inputswitch';
import { SidebarModule } from 'primeng/sidebar';

/**
 * Painel lateral dos formulários de cadastro e edição (card #27): abre à direita (tela cheia no celular),
 * com título, aviso de obrigatórios, corpo com rolagem e rodapé fixo Cancelar · (Salvar e criar outra) · Salvar.
 * O formulário vai como conteúdo. X, Cancelar, Esc e clique fora emitem `fechar`; Salvar emite `salvar`.
 * Enquanto `salvando`, nada fecha o painel (como o [closable]="!salvando" dos diálogos de antes).
 * O painel abre ao ser criado: a tela o mostra com *ngIf/@if, como fazia com o p-dialog.
 */
@Component({
  selector: 'mf-form-panel',
  standalone: true,
  imports: [FormsModule, SidebarModule, ButtonModule, InputSwitchModule, PrimeTemplate],
  template: `
    <p-sidebar [visible]="true" position="right" [fullScreen]="movel" [showCloseIcon]="false" [blockScroll]="true"
      [dismissible]="!salvando" [closeOnEscape]="!salvando"
      [styleClass]="'mf-form-panel mf-form-panel--' + tamanho" (visibleChange)="!$event && fechar.emit()">
      <ng-template pTemplate="header">
        <div class="flex align-items-start justify-content-between gap-2 w-full">
          <div class="min-w-0">
            <div class="mf-form-panel__titulo mf-section-title m-0">{{ titulo }}</div>
            <small class="mf-hint">
              @if (passos > 1) { Passo {{ passo }} de {{ passos }} · }* campos obrigatórios
            </small>
          </div>
          <p-button icon="pi pi-times" [rounded]="true" [text]="true" severity="secondary" ariaLabel="Fechar"
            [disabled]="salvando" (onClick)="fechar.emit()" />
        </div>
      </ng-template>

      <ng-content />

      <!-- Celular (card #61): no lugar do 3º botão do rodapé, um switch no fim do formulário -->
      @if (criarOutra && movel && passo === passos) {
        <div class="mf-form-panel__outra flex align-items-center justify-content-between gap-2 mt-4 pt-3 border-top-1 surface-border">
          <label for="mf-criar-outra" class="m-0">{{ rotuloAlternarCriarOutra }}</label>
          <p-inputSwitch inputId="mf-criar-outra" [(ngModel)]="continuar" [disabled]="salvando" />
        </div>
      }

      <ng-template pTemplate="footer">
        <div class="flex justify-content-end gap-2">
          @if (passo > 1) {
            <p-button label="Voltar" icon="pi pi-arrow-left" severity="secondary" [outlined]="true" [disabled]="salvando"
              (onClick)="voltar.emit()" />
          } @else {
            <p-button label="Cancelar" severity="secondary" [outlined]="true" [disabled]="salvando"
              (onClick)="fechar.emit()" />
          }
          @if (passo < passos) {
            <p-button label="Continuar" icon="pi pi-arrow-right" iconPos="right" (onClick)="avancar.emit()" />
          } @else {
            @if (criarOutra && !movel) {
              <p-button [label]="rotuloCriarOutra" severity="secondary" [outlined]="true" [disabled]="salvando"
                (onClick)="salvarEOutra.emit()" />
            }
            <p-button [label]="rotuloSalvar" icon="pi pi-check" [loading]="salvando" (onClick)="aoSalvar()" />
          }
        </div>
      </ng-template>
    </p-sidebar>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class FormPanelComponent {
  @Input({ required: true }) titulo!: string;
  @Input() salvando = false;
  /** md ≈ 500px (padrão); lg ≈ 720px, para formulários com mais campos por linha. */
  @Input() tamanho: 'md' | 'lg' = 'md';
  /** Mostra "Salvar e criar outra" (card #23): a tela grava, limpa o formulário e deixa o painel aberto. */
  @Input() criarOutra = false;
  /** Rótulo do botão de `criarOutra`; o Planejamento (#63) usa "Criar e abrir" (a tela decide o que vem depois). */
  @Input() rotuloCriarOutra = 'Salvar e criar outra';
  /** Celular: texto do switch que faz o Salvar se comportar como o "criar outra" (card #61). */
  @Input() rotuloAlternarCriarOutra = 'Criar outra depois de salvar';
  /**
   * Formulário em passos (card #22): antes do último, o rodapé troca Salvar por Continuar (emite `avancar`) e,
   * depois do primeiro, Cancelar por Voltar (emite `voltar`). A tela controla `passo` e decide se pode avançar.
   */
  @Input() passos = 1;
  @Input() passo = 1;
  @Input() rotuloSalvar = 'Salvar';
  @Output() fechar = new EventEmitter<void>();
  @Output() salvar = new EventEmitter<void>();
  @Output() salvarEOutra = new EventEmitter<void>();
  @Output() avancar = new EventEmitter<void>();
  @Output() voltar = new EventEmitter<void>();

  /** Abaixo de 768px o painel ocupa a tela inteira. */
  readonly movel = typeof window !== 'undefined' && window.matchMedia('(max-width: 767px)').matches;
  /** Celular: o switch "criar outra" ligado; vale enquanto o painel está aberto. */
  continuar = false;

  /** Salvar: no celular, com o switch ligado, faz o mesmo que o "Salvar e criar outra" do desktop. */
  aoSalvar(): void {
    if (this.criarOutra && this.movel && this.continuar) this.salvarEOutra.emit();
    else this.salvar.emit();
  }
}
