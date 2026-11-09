import { Component, Input, OnChanges, inject } from '@angular/core';
import { ResumoCategoriasDto } from 'src/app/core/models/resumo-categorias.model';
import { ExtratoBancarioItemService } from 'src/app/core/services/extrato-bancario-item.service';
import { extrairMensagemErro } from 'src/app/core/utils/http-error';
import { formatCurrencyBR } from 'src/app/core/utils/mask';
import { AlertService } from 'src/app/shared/components/alert.service';
import { EmptyStateComponent } from 'src/app/shared/ui/empty-state/empty-state.component';

/** "abaixo" é bom e "acima" é alerta; perto da média não chama atenção. */
export function textoVariacao(variacao: number | null | undefined): string {
  if (variacao == null) return '';
  if (variacao === 0) return 'na média';
  return `${Math.abs(variacao)}% ${variacao > 0 ? 'acima' : 'abaixo'} da média`;
}

/** Aba "Resumo" do Extrato (card #76, fase 5): onde o dinheiro foi no mês, comparado com os meses anteriores. */
@Component({
  selector: 'app-resumo-categorias',
  standalone: true,
  imports: [EmptyStateComponent],
  template: `
    @if (resumo; as r) {
      @if (r.categorias.length) {
        <div class="resumo surface-card border-round shadow-1 p-3">
          <div class="flex flex-wrap justify-content-between align-items-baseline gap-2">
            <div>
              <small class="mf-hint block">Gastos do mês</small>
              <strong class="resumo-total">{{ moeda(r.total) }}</strong>
            </div>
            @if (r.variacaoTotal !== null && r.variacaoTotal !== undefined) {
              <small [class.resumo-acima]="r.variacaoTotal > 0" [class.resumo-abaixo]="r.variacaoTotal < 0">
                {{ variacao(r.variacaoTotal) }} ({{ moeda(r.mediaAnterior) }} em {{ r.mesesComparados }} {{ r.mesesComparados === 1 ? 'mês' : 'meses' }})
              </small>
            }
          </div>

          @for (c of r.categorias; track c.categoriaId) {
            <div class="resumo-linha">
              <div class="flex justify-content-between gap-2">
                <span class="font-semibold min-w-0 white-space-nowrap overflow-hidden text-overflow-ellipsis">{{ c.nome }}</span>
                <span class="font-semibold white-space-nowrap">{{ moeda(c.valor) }}</span>
              </div>
              <div class="resumo-barra"><span [style.width.%]="c.percentual"></span></div>
              <div class="flex justify-content-between gap-2">
                <small class="mf-hint">{{ c.percentual }}% do mês</small>
                <small [class.resumo-acima]="(c.variacao ?? 0) > 0" [class.resumo-abaixo]="(c.variacao ?? 0) < 0">{{ variacao(c.variacao) }}</small>
              </div>
            </div>
          }

          @if (r.deOutrasPessoas > 0 || r.foraDoResumo > 0) {
            <div class="resumo-fora">
              @if (r.deOutrasPessoas > 0) {
                <div class="flex justify-content-between"><small class="mf-hint">De outras pessoas (não entra)</small><small>{{ moeda(r.deOutrasPessoas) }}</small></div>
              }
              @if (r.foraDoResumo > 0) {
                <div class="flex justify-content-between"><small class="mf-hint">Pagamento de fatura e transferências (não entra)</small><small>{{ moeda(r.foraDoResumo) }}</small></div>
              }
            </div>
          }
        </div>
      } @else {
        <mf-empty-state icone="pi pi-chart-pie" titulo="Nenhum gasto neste mês" texto="Importe o extrato ou faça um lançamento." />
      }
    } @else if (loading) {
      <p class="mf-hint">Carregando…</p>
    }
  `,
  styles: [`
    .resumo-total { font-size: 1.5rem; }
    .resumo-linha { padding: 0.75rem 0; border-top: 1px solid var(--surface-border); }
    .resumo-linha:first-of-type { margin-top: 0.75rem; }
    .resumo-barra { height: 0.4rem; margin: 0.35rem 0; border-radius: 1rem; overflow: hidden; background: var(--surface-200); }
    .resumo-barra span { display: block; height: 100%; background: var(--primary-color); }
    .resumo-acima { color: var(--mf-despesa); }
    .resumo-abaixo { color: var(--mf-receita); }
    .resumo-fora { padding-top: 0.75rem; border-top: 1px solid var(--surface-border); }
  `]
})
export class ResumoCategoriasComponent implements OnChanges {
  /** "AAAA-MM". */
  @Input({ required: true }) mes!: string;

  private readonly servico = inject(ExtratoBancarioItemService);
  private readonly alertService = inject(AlertService);

  resumo: ResumoCategoriasDto | null = null;
  loading = false;

  ngOnChanges(): void {
    this.loading = true;
    this.resumo = null;
    const pedido = this.mes;
    this.servico.resumoCategorias(pedido).subscribe({
      next: r => {
        if (pedido !== this.mes) return;
        this.loading = false;
        this.resumo = r;
      },
      error: e => {
        this.loading = false;
        this.alertService.error(extrairMensagemErro(e, 'Erro ao carregar o resumo.'));
      }
    });
  }

  moeda(v: number | null | undefined): string {
    return formatCurrencyBR(v ?? 0);
  }

  variacao(v: number | null | undefined): string {
    return textoVariacao(v);
  }
}
