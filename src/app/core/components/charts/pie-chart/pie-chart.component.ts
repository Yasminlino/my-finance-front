import { Component, Input, OnChanges, SimpleChanges } from '@angular/core';
import type {
  ApexChart,
  ApexDataLabels,
  ApexLegend,
  ApexTooltip,
  ApexResponsive,
  ApexFill
} from 'ng-apexcharts';
import { formatCurrencyBR } from 'src/app/core/utils/mask';

export type ApexPieChartOptions = {
  series: number[];
  chart?: ApexChart;
  labels?: string[];
  dataLabels?: ApexDataLabels;
  legend?: ApexLegend;
  tooltip?: ApexTooltip;
  colors?: string[];
  responsive?: ApexResponsive[];
  fill?: ApexFill;
};

type ApexPieChartOptionsRequired = {
  series: number[];
  chart: ApexChart;
  labels: string[];
  dataLabels: ApexDataLabels;
  legend: ApexLegend;
  tooltip: ApexTooltip;
  colors: string[];
  responsive: ApexResponsive[];
  fill: ApexFill;
};

@Component({
  selector: 'app-pie-chart',
  templateUrl: './pie-chart.component.html',
  styleUrls: ['./pie-chart.component.scss'],
})
export class PieChartComponent implements OnChanges {
  @Input({ required: true }) options!: ApexPieChartOptions;

  @Input() titleText?: string;
  @Input() cardClass = '';
  @Input() useCard = true;
  @Input() height = 240;

  merged!: ApexPieChartOptionsRequired;

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['options'] || changes['height']) {
      this.merged = this.buildMergedOptions();
    }
  }

  private buildMergedOptions(): ApexPieChartOptionsRequired {
    const opt = this.options;

    const chart: ApexChart = {
      ...(opt.chart ?? { type: 'pie' }),
      type: 'pie',
      height: (opt.chart?.height as any) ?? this.height,
    };

    return {
      series: opt.series ?? [],
      chart,
      labels: opt.labels ?? [],
      dataLabels: opt.dataLabels ?? { enabled: true },
      legend: opt.legend ?? { position: 'bottom' },
      tooltip: {
        ...opt.tooltip,
        y: {
          formatter: (value: number) => formatCurrencyBR(value)
        }
      },
      colors: opt.colors ?? [],
      responsive: opt.responsive ?? [],
      fill: opt.fill ?? {},
    };
  }
}