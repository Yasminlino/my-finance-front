import { ApexChartOptions } from './apex-chart/apex-chart.component';

export type GastosBarChartParams = {
  /** Texto do nome da série (aparece no tooltip e legenda se habilitar) */
  seriesName?: string;

  /** Valores das barras */
  data: number[];

  /** Labels no eixo Y (como é horizontal, aparecem à esquerda) */
  categories: string[];

  /** Altura do gráfico (px) */
  height?: number;

  /** Mostrar legenda? (no seu layout geralmente é false) */
  showLegend?: boolean;

  /** Tema do tooltip */
  tooltipTheme?: 'light' | 'dark';

  /** Cores (quando distributed=true, uma cor por barra) */
  colors?: string[];

  /** Espessura da barra (horizontal) */
  barHeight?: string; // ex: '50%'

  /** Bordas arredondadas da barra */
  borderRadius?: number;

  /** Quantidade de marcações no eixo X */
  tickAmount?: number;

  /** Valor mínimo do eixo X */
  minX?: number;

  /**
   * Formata os rótulos do eixo X (os números embaixo)
   * Ex.: (v) => `R$ ${v.toLocaleString('pt-BR')}`
   */
  xLabelFormatter?: (val: number) => string;

  /**
   * ✅ Formata o valor no TOOLTIP.
   * Recebe o valor da barra e o índice da barra (dataPointIndex).
   * Ex.: (v) => formatMoneyBR(v)
   * Ex.: (v,i) => `${formatMoneyBR(v)} (${percentuais[i].toFixed(1)}%)`
   */
  tooltipValueFormatter?: (value: number, index: number) => string;

  onCategoryClick?: (category: string, value: number, index: number) => void;
};

/**
 * Factory para criar um gráfico estilo "print":
 * - barras horizontais
 * - 1 série
 * - sem empilhamento
 * - cores por barra (distributed)
 * - grid tracejado
 */
export function createGastosBarLikeImageChart(params: GastosBarChartParams): ApexChartOptions {
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

  return {
    series: [
      {
        name: seriesName,
        data,
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
          const value = data[index] ?? 0;

          onCategoryClick?.(category, value, index);
        },
      },
    },
    plotOptions: {
      bar: {
        horizontal: true,
        barHeight,
        distributed: true,
        borderRadius,
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

    // ✅ Aqui está a parte que resolve seu problema:
    // Agora o tooltip pode formatar como moeda (e até mostrar %).
    tooltip: {
      theme: tooltipTheme,
      y: {
        formatter: (val: number, opts: any) => {
          const i = opts?.dataPointIndex ?? 0;
          return tooltipValueFormatter ? tooltipValueFormatter(val, i) : String(val);
        },
      },
    },

    legend: { show: showLegend },

    colors,
  };
}