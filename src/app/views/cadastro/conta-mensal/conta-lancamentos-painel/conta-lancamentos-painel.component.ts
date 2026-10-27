import { Component, DestroyRef, EventEmitter, Input, OnInit, Output, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { finalize } from 'rxjs';
import { PrimeTemplate } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { SidebarModule } from 'primeng/sidebar';
import { CalendarModule } from 'primeng/calendar';
import { FormsModule } from '@angular/forms';
import { ContaService } from 'src/app/core/services/contas.service';
import { LarguraTelaService } from 'src/app/core/services/largura-tela.service';
import { ContaDto, LancamentoDaConta } from 'src/app/core/models/conta.model';
import { AparenciaCategoria } from 'src/app/shared/ui/aparencia';
import { CategoryIconComponent } from 'src/app/shared/ui/category-icon/category-icon.component';
import { ContaLancamentosComponent } from '../conta-lancamentos/conta-lancamentos.component';
import { ContaAcompanhamentoComponent } from '../conta-acompanhamento/conta-acompanhamento.component';
import { MesAno, Periodo, diasDaConta, lancamentosNoPeriodo, periodoPadrao, textoVencimento } from '../contas.regras';

/**
 * Lançamentos de uma conta num painel próprio (card #22), aberto pelo ⋮ "Ver lançamentos": resumo, card
 * Acompanhamento e a lista por mês. Só consulta; "Editar conta" pede à lista para abrir a edição.
 */
@Component({
  selector: 'app-conta-lancamentos-painel',
  standalone: true,
  imports: [SidebarModule, ButtonModule, PrimeTemplate, CalendarModule, FormsModule, CategoryIconComponent, ContaLancamentosComponent, ContaAcompanhamentoComponent],
  template: `
    <p-sidebar [visible]="true" position="right" [fullScreen]="movel()" [showCloseIcon]="false" [blockScroll]="true"
      styleClass="mf-form-panel mf-form-panel--lg mf-lancamentos-painel" (visibleChange)="!$event && fechar.emit()">
      <ng-template pTemplate="header">
        <div class="flex align-items-start justify-content-between gap-2 w-full">
          <div class="flex align-items-center gap-2 min-w-0">
            <mf-category-icon [natureza]="aparencia?.natureza" [cor]="aparencia?.cor" [icone]="aparencia?.icone ?? 'pi pi-tag'" />
            <div class="min-w-0">
              <div class="mf-section-title m-0">{{ conta.nome }}</div>
              <small class="mf-hint">{{ conta.categoriaNome }} · {{ vencimento }}</small>
            </div>
          </div>
          <p-button icon="pi pi-times" [rounded]="true" [text]="true" severity="secondary" ariaLabel="Fechar painel"
            (onClick)="fechar.emit()" />
        </div>
      </ng-template>

      <!-- Período (card #22): vale para o resumo, o gráfico e a lista. -->
      <!-- Um campo só: clica no mês inicial e depois no final ("jan/2026 a dez/2026"). -->
      <div class="lancamentos-periodo flex flex-column gap-1 mb-3">
        <label for="periodo" class="mf-label">Período</label>
        <p-calendar inputId="periodo" [(ngModel)]="intervalo" selectionMode="range" view="month" dateFormat="M/yy"
          rangeSeparator=" a " [readonlyInput]="true" appendTo="body" [disabled]="carregando" styleClass="w-full"
          (onSelect)="intervalo[1] && aoMudarPeriodo()" (onClose)="aoMudarPeriodo()" />
      </div>

      <app-conta-lancamentos [lancamentos]="lancamentosDoPeriodo" [carregando]="carregando" [erro]="erro">
        @if (lancamentosDoPeriodo.length && !carregando) {
          <app-conta-acompanhamento [lancamentos]="lancamentosDoPeriodo" [periodo]="periodo" />
        }
      </app-conta-lancamentos>

      <ng-template pTemplate="footer">
        <div class="flex justify-content-end gap-2">
          <p-button label="Fechar" severity="secondary" [outlined]="true" (onClick)="fechar.emit()" />
          <p-button label="Editar conta" icon="pi pi-pencil" (onClick)="editar.emit()" />
        </div>
      </ng-template>
    </p-sidebar>
  `
})
export class ContaLancamentosPainelComponent implements OnInit {
  @Input({ required: true }) conta!: ContaDto;
  @Input() aparencia: AparenciaCategoria & { icone?: string | null } | null = null;
  @Output() fechar = new EventEmitter<void>();
  @Output() editar = new EventEmitter<void>();

  private readonly contaService = inject(ContaService);
  private readonly destroyRef = inject(DestroyRef);
  readonly movel = inject(LarguraTelaService).movel;

  lancamentos: LancamentoDaConta[] = [];
  carregando = false;
  erro = false;

  /** Campo do calendário em intervalo: [mês inicial, mês final]; o final fica null até o segundo clique. */
  intervalo: (Date | null)[] = [];
  periodo: Periodo = periodoPadrao([]);
  lancamentosDoPeriodo: LancamentoDaConta[] = [];

  /** Fechou o calendário com só o mês inicial: o período é aquele mês. */
  aoMudarPeriodo() {
    const [inicio, fim] = this.intervalo ?? [];
    if (!inicio) {
      this.usarPeriodo(this.periodo);
      return;
    }
    const de = this.mesAno(inicio);
    this.usarPeriodo({ de, ate: fim ? this.mesAno(fim) : de });
  }

  private usarPeriodo(periodo: Periodo) {
    this.periodo = periodo;
    this.intervalo = [new Date(periodo.de.ano, periodo.de.mes - 1, 1), new Date(periodo.ate.ano, periodo.ate.mes - 1, 1)];
    this.lancamentosDoPeriodo = lancamentosNoPeriodo(this.lancamentos, periodo);
  }

  private mesAno(data: Date): MesAno {
    return { ano: data.getFullYear(), mes: data.getMonth() + 1 };
  }

  get vencimento(): string {
    return textoVencimento(diasDaConta(this.conta));
  }

  ngOnInit(): void {
    this.carregando = true;
    this.contaService.listarLancamentos(this.conta.id)
      .pipe(finalize(() => (this.carregando = false)), takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: lancamentos => {
          this.lancamentos = lancamentos;
          this.usarPeriodo(periodoPadrao(lancamentos));
        },
        error: () => (this.erro = true)
      });
  }
}
