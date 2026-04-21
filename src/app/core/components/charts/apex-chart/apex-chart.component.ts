import { Component, Input, OnChanges, SimpleChanges } from '@angular/core';
import type {
  ApexAxisChartSeries,
  ApexChart,
  ApexDataLabels,
  ApexFill,
  ApexGrid,
  ApexLegend,
  ApexPlotOptions,
  ApexStroke,
  ApexTooltip,
  ApexXAxis,
  ApexYAxis,
  ApexTitleSubtitle,
} from 'ng-apexcharts';

export type ApexChartOptions = {
  series: ApexAxisChartSeries;
  chart: ApexChart;
  plotOptions?: ApexPlotOptions;
  dataLabels?: ApexDataLabels;
  grid?: ApexGrid;
  xaxis?: ApexXAxis;
  yaxis?: ApexYAxis | ApexYAxis[];
  tooltip?: ApexTooltip;
  legend?: ApexLegend;
  colors?: string[];
  fill?: ApexFill;
  stroke?: ApexStroke;
  title?: ApexTitleSubtitle;
};

type ApexChartOptionsRequired = {
  series: ApexAxisChartSeries;
  chart: ApexChart;
  plotOptions: ApexPlotOptions;
  dataLabels: ApexDataLabels;
  grid: ApexGrid;
  xaxis: ApexXAxis;
  yaxis: ApexYAxis | ApexYAxis[];
  tooltip: ApexTooltip;
  legend: ApexLegend;
  colors: any[];
  fill: ApexFill;
  stroke: ApexStroke;
  title: ApexTitleSubtitle;
};

@Component({
  selector: 'app-apex-chart',
  templateUrl: './apex-chart.component.html',
  styleUrls: ['./apex-chart.component.scss'],
})
export class ApexChartComponent implements OnChanges {
  /** obrigatório */
  @Input({ required: true }) options!: ApexChartOptions;

  /** opcionais de layout */
  @Input() titleText?: string;     // (evita conflito mental com options.title)
  @Input() cardClass = '';
  @Input() useCard = true;

  /** ✅ precisa existir pra você conseguir usar [height] no template */
  @Input() height = 240;

  /** opções já “normalizadas” (sem undefined) */
  merged!: ApexChartOptionsRequired;

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['options'] || changes['height']) {
      this.merged = this.buildMergedOptions();
    }
  }

  private buildMergedOptions(): ApexChartOptionsRequired {
    const opt = this.options;

    // Defaults mínimos pra nunca passar undefined para o <apx-chart>
    const chart: ApexChart = {
      ...(opt.chart ?? { type: 'bar' }),
      height: (opt.chart?.height as any) ?? this.height,
      fontFamily: opt.chart?.fontFamily ?? 'inherit',
    };

    return {
      series: opt.series ?? [],
      chart,

      plotOptions: opt.plotOptions ?? {},
      dataLabels: opt.dataLabels ?? { enabled: false },
      grid: opt.grid ?? {},
      xaxis: opt.xaxis ?? {},
      yaxis: opt.yaxis ?? {},

      tooltip: opt.tooltip ?? {},
      legend: opt.legend ?? {},

      colors: (opt.colors ?? []) as any[],
      fill: opt.fill ?? {},
      stroke: opt.stroke ?? {},
      title: opt.title ?? {},
    };
  }
}