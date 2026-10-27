import { ChangeDetectionStrategy, Component, Input, OnChanges } from '@angular/core';
import { NgApexchartsModule } from 'ng-apexcharts';
import type { ApexChart, ApexDataLabels, ApexGrid, ApexLegend, ApexMarkers, ApexStroke, ApexXAxis, ApexYAxis } from 'ng-apexcharts';
import { LancamentoDaConta } from 'src/app/core/models/conta.model';
import { formatCurrencyBR } from 'src/app/core/utils/mask';
import { Periodo, PontosAcompanhamento, SituacaoDoMes, periodoPadrao, pontosDoAcompanhamento } from '../contas.regras';

export interface OpcoesAcompanhamento {
  series: { name: string; data: (number | null)[] }[];
  chart: ApexChart;
  dataLabels: ApexDataLabels;
  stroke: ApexStroke;
  markers: ApexMarkers;
  grid: ApexGrid;
  xaxis: ApexXAxis;
  yaxis: ApexYAxis;
  legend: ApexLegend;
  tooltip: { y: { formatter: (valor: number) => string } };
  colors: string[];
}

function token(nome: string, reserva: string): string {
  return getComputedStyle(document.documentElement).getPropertyValue(nome).trim() || reserva;
}

/**
 * Card Acompanhamento do painel de lançamentos (card #22): uma linha com o valor de cada mês (do período) e o ponto
 * na cor da situação do mês. Cores validadas (verde × laranja ΔE 7,3 para daltonismo): por isso legenda sempre
 * visível, situação também no tooltip e a lista abaixo como tabela. Mês muito fora do padrão ganha aviso.
 */
@Component({
  selector: 'app-conta-acompanhamento',
  standalone: true,
  imports: [NgApexchartsModule],
  templateUrl: './conta-acompanhamento.component.html',
  styleUrls: ['./conta-acompanhamento.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ContaAcompanhamentoComponent implements OnChanges {
  @Input() lancamentos: LancamentoDaConta[] = [];
  @Input() hoje = new Date();
  /** Período escolhido no painel; sem ele, o padrão (12 meses até o mais recente). */
  @Input() periodo: Periodo | null = null;

  /** Cores dos pontos: as das tags de Contas a Pagar, lidas dos tokens do tema. */
  readonly cores: Record<SituacaoDoMes, string> = {
    'no-prazo': token('--green-600', '#16a34a'),
    atraso: token('--orange-700', '#c2410c'),
    aberto: token('--blue-500', '#3b82f6')
  };
  readonly legenda: { situacao: SituacaoDoMes; rotulo: string }[] = [
    { situacao: 'no-prazo', rotulo: 'Pago no prazo' },
    { situacao: 'atraso', rotulo: 'Pago com atraso' },
    { situacao: 'aberto', rotulo: 'Em aberto' }
  ];
  private readonly rotuloDaSituacao = Object.fromEntries(this.legenda.map(i => [i.situacao, i.rotulo])) as Record<SituacaoDoMes, string>;

  pontos: PontosAcompanhamento = pontosDoAcompanhamento([], periodoPadrao([], this.hoje));
  opcoes: OpcoesAcompanhamento = this.montar();

  ngOnChanges(): void {
    const lancamentos = this.lancamentos ?? [];
    this.pontos = pontosDoAcompanhamento(lancamentos, this.periodo ?? periodoPadrao(lancamentos, this.hoje));
    this.opcoes = this.montar();
  }

  /** "dez/25 a nov/26" */
  get textoPeriodo(): string {
    const { meses } = this.pontos;
    return meses.length ? `${meses[0]} a ${meses[meses.length - 1]}` : '';
  }

  moeda(valor: number): string {
    return formatCurrencyBR(valor);
  }

  private montar(): OpcoesAcompanhamento {
    const p = this.pontos;
    const tinta = token('--text-color-secondary', '#6b7280');
    const linha = token('--text-color', '#374151');
    const fundo = token('--surface-card', '#ffffff');
    const ultimo = p.valores.length - 1;
    return {
      series: [{ name: 'Valor do mês', data: p.valores }],
      chart: { type: 'line', height: 240, toolbar: { show: false }, zoom: { enabled: false }, fontFamily: 'inherit' },
      // Só o último mês tem o valor escrito; os outros ficam no tooltip.
      dataLabels: {
        enabled: true,
        formatter: (valor: number, ctx: { dataPointIndex: number }) => (ctx.dataPointIndex === ultimo && valor !== null ? formatCurrencyBR(valor) : ''),
        offsetY: -8,
        background: { enabled: false },
        style: { colors: [linha], fontWeight: 600 }
      },
      stroke: { curve: 'straight', width: 2 },
      markers: {
        size: 0,
        hover: { size: 7 },
        // Ponto de cada mês com lançamento, na cor da situação; anel do fundo do card em volta.
        discrete: p.situacoes.flatMap((situacao, i) => situacao
          ? [{ seriesIndex: 0, dataPointIndex: i, fillColor: this.cores[situacao], strokeColor: fundo, size: 5 }]
          : [])
      },
      // À direita, espaço para o valor escrito no último mês não ser cortado.
      grid: { borderColor: token('--surface-border', '#e5e7eb'), xaxis: { lines: { show: false } }, padding: { top: 16, right: 48 } },
      xaxis: {
        categories: p.meses, labels: { style: { colors: tinta } }, axisBorder: { show: false }, axisTicks: { show: false },
        // O mês já está no título do tooltip; a caixa do eixo só repetiria.
        tooltip: { enabled: false }
      },
      yaxis: { labels: { style: { colors: tinta }, formatter: v => formatCurrencyBR(v).replace(/,00$/, '') } },
      legend: { show: false },
      tooltip: {
        y: { formatter: v => formatCurrencyBR(v) },
        // A situação vai no título do tooltip ("out/26 · Pago no prazo"), para não depender só da cor.
        x: { formatter: (_: number, ctx: { dataPointIndex: number }) =>
          [p.meses[ctx.dataPointIndex], p.situacoes[ctx.dataPointIndex] && this.rotuloDaSituacao[p.situacoes[ctx.dataPointIndex]!]]
            .filter(Boolean).join(' · ') }
      } as OpcoesAcompanhamento['tooltip'],
      colors: [linha]
    };
  }
}
