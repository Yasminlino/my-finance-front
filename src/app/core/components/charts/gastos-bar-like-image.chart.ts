import { ApexChartOptions } from './apex-chart/apex-chart.component';

export type GastosBarChartParams = {
  seriesName?: string;

  /** modo simples */
  data?: number[];

  /** modo múltiplas séries (entrada vs saída) */
  series?: { name: string; data: number[] }[];

  categories: string[];

  height?: number;
  showLegend?: boolean;
  tooltipTheme?: 'light' | 'dark';

  colors?: string[];

  barHeight?: string;
  borderRadius?: number;

  tickAmount?: number;
  minX?: number;

  xLabelFormatter?: (val: number) => string;

  tooltipValueFormatter?: (value: number, index: number) => string;

  onCategoryClick?: (category: string, value: number, index: number) => void;
};

export function createGastosBarLikeImageChart(
  params: GastosBarChartParams
): ApexChartOptions {

  const {
    seriesName = 'Gastos',
    data,
    categories,

    height = 240,
    showLegend = false,
    tooltipTheme = 'light',

    colors = [
      '#1e66ff',
      '#0b57d0',
      '#1a73e8',
      '#0a66c2',
      '#1f7aff',
      '#0b5ed7',
      '#2b7cff',
    ],

    barHeight = '50%',
    borderRadius = 2,

    tickAmount = 5,
    minX = 0,

    xLabelFormatter = (val) => `${Math.round(val)}`,

    tooltipValueFormatter,
    onCategoryClick,
  } = params;

  const hasMultipleSeries = !!params.series;

  return {
    /** ✅ suporta 1 ou várias séries */
    series: hasMultipleSeries
      ? params.series!
      : [
          {
            name: seriesName,
            data: data ?? [],
          },
        ],

    chart: {
      type: 'bar',
      height,
      stacked: false,
      toolbar: { show: false },
      animations: { enabled: false },
      fontFamily: 'inherit',

      events: {
        dataPointSelection: (_event: any, _chartContext: any, config: any) => {
          const index = config?.dataPointIndex ?? -1;
          if (index < 0) return;

          const category = categories[index] ?? '';
          const seriesIndex = config?.seriesIndex ?? 0;

          const value = hasMultipleSeries
            ? params.series?.[seriesIndex]?.data[index] ?? 0
            : data?.[index] ?? 0;

          onCategoryClick?.(category, value, index);
        },
      },
    },

    plotOptions: {
      bar: {
        horizontal: true,
        barHeight,
        borderRadius,
        columnWidth: '60%',

        /** ✅ só distribui cor quando for 1 série */
        distributed: !hasMultipleSeries,
      },
    },

    dataLabels: { enabled: false },

    grid: {
      strokeDashArray: 4,
      padding: { left: 8, right: 12, top: 0, bottom: 0 },
    },

    yaxis: {
      labels: {
        style: { fontSize: '12px' },
      },
    },

    xaxis: {
      categories,
      min: minX,
      tickAmount,
      axisBorder: { show: false },
      axisTicks: { show: false },
      labels: {
        style: { fontSize: '12px' },
        formatter: (val) => xLabelFormatter(Number(val)),
      },
    },

    /** ✅ tooltip melhorado com nome da série */
    tooltip: {
      theme: tooltipTheme,
      y: {
        formatter: (val: number, opts: any) => {
          const i = opts?.dataPointIndex ?? 0;
          const seriesIndex = opts?.seriesIndex ?? 0;

          const nomeSerie = hasMultipleSeries
            ? params.series?.[seriesIndex]?.name
            : seriesName;

          const formatted = tooltipValueFormatter
            ? tooltipValueFormatter(val, i)
            : String(val);

          return `${nomeSerie}: ${formatted}`;
        },
      },
    },

    legend: { show: showLegend },

    /** ✅ cores automáticas inteligentes */
    colors: hasMultipleSeries
      ? params.series!.map(s =>
          s.name.toLowerCase().includes('entrada')
            ? '#22c55e' // verde
            : '#ef4444' // vermelho
        )
      : colors,
  };
}