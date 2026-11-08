import { Component, EventEmitter, OnInit, Output, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { PrimeTemplate } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { CheckboxModule } from 'primeng/checkbox';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { PessoaEstabelecimentoDto } from 'src/app/core/models/pessoa-movimentacao.model';
import { ConfirmacaoService } from 'src/app/core/services/confirmacao.service';
import { PessoaMovimentacaoService } from 'src/app/core/services/pessoa-movimentacao.service';
import { extrairMensagemErro } from 'src/app/core/utils/http-error';
import { AlertService } from 'src/app/shared/components/alert.service';
import { EmptyStateComponent } from 'src/app/shared/ui/empty-state/empty-state.component';
import { normalizarTexto } from '../../classificacao/classificacao.regras';

/**
 * "Limpar estabelecimentos" (card #76, fase 2): a importação antiga cadastrava cada nome (SHOPEE, HAVAN…) como pessoa.
 * Lista as que parecem estabelecimento (fora dos acertos, sem padrão, sem regra) e apaga só as que você marcar; os
 * lançamentos continuam com o nome.
 */
@Component({
  selector: 'app-limpar-estabelecimentos',
  standalone: true,
  imports: [FormsModule, PrimeTemplate, ButtonModule, CheckboxModule, DialogModule, InputTextModule, EmptyStateComponent],
  template: `
    <p-dialog header="Limpar estabelecimentos" [visible]="true" [modal]="true" [draggable]="false" [dismissableMask]="!apagando"
      [style]="{ width: '36rem' }" [breakpoints]="{ '768px': '96vw' }" (visibleChange)="!$event && fechado.emit(0)">
      <p class="mt-0 mf-hint">
        Nomes que a importação cadastrou como pessoa, mas que não entram nos acertos, não têm categoria nem tipo padrão e
        nenhuma regra usa. Apagar só tira o cadastro: os lançamentos continuam com o nome.
      </p>

      @if (!loading && candidatas.length) {
        <div class="limpar-topo">
          <span class="p-input-icon-left flex-grow-1">
            <i class="pi pi-search"></i>
            <input pInputText class="w-full p-inputtext-sm" placeholder="Buscar nome..." aria-label="Buscar nome" [(ngModel)]="busca" />
          </span>
          <p-checkbox [binary]="true" inputId="limpar-todas" [ngModel]="todasMarcadas" (onChange)="marcarTodas($event.checked)" />
          <label for="limpar-todas" class="white-space-nowrap">Marcar {{ busca ? 'as visíveis' : 'todas' }}</label>
        </div>
      }

      <div class="limpar-lista">
        @for (c of visiveis; track c.id) {
          <label class="limpar-linha" [for]="'limpar-' + c.id">
            <p-checkbox [binary]="true" [inputId]="'limpar-' + c.id" [ngModel]="marcadas.has(c.id)" (onChange)="alternar(c.id, $event.checked)" />
            <span class="flex-grow-1 min-w-0 white-space-nowrap overflow-hidden text-overflow-ellipsis">{{ c.nomePessoa }}</span>
            <small class="mf-hint white-space-nowrap">{{ c.lancamentos === 1 ? '1 lançamento' : c.lancamentos + ' lançamentos' }}</small>
          </label>
        } @empty {
          @if (loading) {
            <p class="mf-hint"><i class="pi pi-spin pi-spinner"></i> Procurando...</p>
          } @else if (busca) {
            <p class="mf-hint">Nenhum nome com "{{ busca }}".</p>
          } @else {
            <mf-empty-state icone="pi pi-check-circle" titulo="Nada para limpar"
              texto="Nenhuma pessoa parece estabelecimento. Nomes novos da importação já não viram pessoa." />
          }
        }
      </div>

      <ng-template pTemplate="footer">
        <p-button label="Fechar" severity="secondary" [outlined]="true" [disabled]="apagando" (onClick)="fechado.emit(0)" />
        <p-button [label]="marcadas.size ? 'Apagar ' + marcadas.size : 'Apagar'" icon="pi pi-trash" severity="danger"
          [disabled]="!marcadas.size" [loading]="apagando" (onClick)="apagar()" />
      </ng-template>
    </p-dialog>
  `,
  styles: [`
    .limpar-topo { display: flex; align-items: center; gap: 0.75rem; margin-bottom: 0.5rem; }
    .limpar-lista { display: flex; flex-direction: column; max-height: 55vh; overflow-y: auto; }
    .limpar-linha {
      display: flex; align-items: center; gap: 0.75rem; padding: 0.6rem 0.25rem; border-bottom: 1px solid var(--surface-border);
      cursor: pointer;
    }
  `]
})
export class LimparEstabelecimentosComponent implements OnInit {
  /** Fechou; com quantas pessoas foram apagadas (0 = nada mudou). */
  @Output() fechado = new EventEmitter<number>();

  private readonly servico = inject(PessoaMovimentacaoService);
  private readonly confirmacao = inject(ConfirmacaoService);
  private readonly alertService = inject(AlertService);

  candidatas: PessoaEstabelecimentoDto[] = [];
  marcadas = new Set<number>();
  busca = '';
  loading = false;
  apagando = false;

  ngOnInit(): void {
    this.loading = true;
    this.servico.estabelecimentos().subscribe({
      next: c => {
        this.loading = false;
        this.candidatas = c;
      },
      error: e => {
        this.loading = false;
        this.alertService.error(extrairMensagemErro(e, 'Erro ao procurar os estabelecimentos.'));
      }
    });
  }

  get visiveis(): PessoaEstabelecimentoDto[] {
    const termo = normalizarTexto(this.busca);
    return termo ? this.candidatas.filter(c => normalizarTexto(c.nomePessoa).includes(termo)) : this.candidatas;
  }

  get todasMarcadas(): boolean {
    const v = this.visiveis;
    return v.length > 0 && v.every(c => this.marcadas.has(c.id));
  }

  alternar(id: number, marcada: boolean): void {
    const novas = new Set(this.marcadas);
    if (marcada) novas.add(id); else novas.delete(id);
    this.marcadas = novas;
  }

  marcarTodas(marcar: boolean): void {
    const novas = new Set(this.marcadas);
    for (const c of this.visiveis) {
      if (marcar) novas.add(c.id); else novas.delete(c.id);
    }
    this.marcadas = novas;
  }

  async apagar(): Promise<void> {
    const n = this.marcadas.size;
    if (!n || this.apagando) return;
    const ok = await this.confirmacao.confirmar(
      n === 1
        ? 'Apagar 1 cadastro? Os lançamentos continuam com o nome.'
        : `Apagar ${n} cadastros? Os lançamentos continuam com o nome.`,
      { titulo: 'Limpar estabelecimentos', aceitar: n === 1 ? 'Apagar 1' : `Apagar ${n}` });
    if (!ok) return;
    this.apagando = true;
    this.servico.removerEstabelecimentos([...this.marcadas]).subscribe({
      next: quantidade => {
        this.apagando = false;
        this.alertService.success(quantidade === 1 ? '1 cadastro apagado.' : `${quantidade} cadastros apagados.`);
        this.fechado.emit(quantidade);
      },
      error: e => {
        this.apagando = false;
        this.alertService.error(extrairMensagemErro(e, 'Erro ao apagar os cadastros.'));
      }
    });
  }
}
