import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { PrimeTemplate } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
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
  imports: [SidebarModule, ButtonModule, PrimeTemplate],
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
            @if (criarOutra) {
              <p-button label="Salvar e criar outra" severity="secondary" [outlined]="true" [disabled]="salvando"
                (onClick)="salvarEOutra.emit()" />
            }
            <p-button [label]="rotuloSalvar" icon="pi pi-check" [loading]="salvando" (onClick)="salvar.emit()" />
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
}
