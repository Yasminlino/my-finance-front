import { Component, Input, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ApexChartOptions } from 'src/app/core/components/charts/apex-chart/apex-chart.component';
import { createGastosBarLikeImageChart } from 'src/app/core/components/charts/gastos-bar-like-image.chart';
import { ExtratoBancarioItemService } from 'src/app/core/services/extrato-bancario-item.service';
import { Meses } from 'src/app/views/movimentacao/extrato-bancario/components/models/meses';

function toNumber(v: any): number {
  // se vier string "123.45" ou number, converte para number
  const n = Number(v);
  return isNaN(n) ? 0 : n;
}


@Component({
  selector: 'app-relatorio-gastos-mensais',
  templateUrl: './relatorio-gastos-mensais.component.html',
  styleUrls: ['./relatorio-gastos-mensais.component.scss']
})
export class RelatorioGastosMensaisComponent implements OnInit {
  extratoItems: any[] = [];
  meses = Meses;

  //card banco
  totalPorBanco: [string, number][] = [];
  relatorioBanco: ApexChartOptions = {} as ApexChartOptions;

  //card categoria
  totalPorCategoria: [string, number][] = [];
  gastosPorCategoria: ApexChartOptions = {} as ApexChartOptions;

  //card tipo movimentação
  totalPorTipoMovimentacao: [string, number][] = [];
  gastosPorTipoMovimentacao: ApexChartOptions = {} as ApexChartOptions;
  tituloRelarioBanco: string = 'ddd';

  constructor(private extratoItemService: ExtratoBancarioItemService, private route: ActivatedRoute, private router: Router) { }

  async ngOnInit() {
    var monthFilter = this.getMonthFilter();
    if (!monthFilter) {
      console.error('Month filter is required in the URL query parameters');
      return;
    }
    await this.extratoItemService.listExtratos(monthFilter).then(items => {
      this.extratoItems = items.filter(item => item.tipoLancamento === 'Saída');
    });

    this.calculaDadosPorBanco();
    this.calculaDadosPorCategoria('');
    this.calcularDadosPorTipoMovimentacao('');
  }

  getMonthFilter(): string | null {
    return this.route.snapshot.queryParamMap.get('month');
  }

  getMonthName(): string | null {
    const monthNumber = this.getMonthFilter();
    if (!monthNumber) return null;

    var split = monthNumber.split('-');
    var mes = parseInt(split[1], 10);
    return this.meses[mes] + ' de ' + split[0];
  }

  calculaTotal(){
    return this.extratoItems.reduce((acc, item) => acc + toNumber(item.valor), 0);
  }

  calculaDadosPorBanco() {
    const map = new Map<string, number>();

    for (const item of this.extratoItems) {
      const nome = item.banco?.nomeBanco ?? 'Sem banco';
      const valor = toNumber(item.valor);
      map.set(nome, (map.get(nome) ?? 0) + valor);
    }

    this.totalPorBanco = Array.from(map.entries())
      .filter(([, v]) => v > 0)
      .sort((a, b) => b[1] - a[1]);

    const totais = this.totalPorBanco.map(([, v]) => v);
    const totalMes = totais.reduce((acc, v) => acc + v, 0);

    // Label com percentual
    const bancos = this.totalPorBanco.map(([nome, valor]) => {
      return nome;
    });

    // Ajusta altura dinamicamente (opcional)
    const height = Math.max(240, bancos.length * 34);
    const percentuais = this.totalPorBanco.map(([, valor]) =>
      totalMes > 0 ? (valor / totalMes) * 100 : 0
    );

    this.relatorioBanco = createGastosBarLikeImageChart({
      seriesName: 'Gastos do mês',
      data: totais,
      categories: bancos,
      height: 240,
      tooltipTheme: 'light',
      showLegend: false,
      // eixo X em moeda
      xLabelFormatter: (v) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v),
      // ✅ tooltip em moeda + percentual
      tooltipValueFormatter: (v, i) =>
        `${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)} (${percentuais[i].toFixed(1)}%)`,
      onCategoryClick: (category, value, index) => {
        this.onBancoClick(category, value, index);
      },
    });

    console.log('Total por banco:', this.totalPorBanco);
  }

  calculaDadosPorCategoria(bancoLabel: string) {
    const map = new Map<string, number>();
    var extratos = bancoLabel == '' ? this.extratoItems : this.extratoItems.filter((item) => item.banco?.nomeBanco === bancoLabel);

    for (const item of extratos) {
      const nome = item.categoria?.name ?? 'Sem categoria';
      const valor = toNumber(item.valor);
      map.set(nome, (map.get(nome) ?? 0) + valor);
    }

    this.totalPorCategoria = Array.from(map.entries())
      .filter(([, v]) => v > 0)
      .sort((a, b) => b[1] - a[1]);

    const totais = this.totalPorCategoria.map(([, v]) => v);
    const totalMes = totais.reduce((acc, v) => acc + v, 0);

    // Label com percentual
    const categorias = this.totalPorCategoria.map(([nome, valor]) => {
      return nome;
    });

    // Ajusta altura dinamicamente (opcional)
    const height = Math.max(240, categorias.length * 34);
    const percentuais = this.totalPorCategoria.map(([, valor]) =>
      totalMes > 0 ? (valor / totalMes) * 100 : 0
    );
    this.tituloRelarioBanco = "Gastos por banco e tipo de conta"
    this.gastosPorCategoria = createGastosBarLikeImageChart({
      seriesName: 'Gastos do mês',
      data: totais,
      categories: categorias,
      height: 500,
      tooltipTheme: 'light',
      showLegend: false,
      // eixo X em moeda
      xLabelFormatter: (v) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v),
      // ✅ tooltip em moeda + percentual
      tooltipValueFormatter: (v, i) =>
        `${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)} (${percentuais[i].toFixed(1)}%)`,
      onCategoryClick: (category, value, index) => {
        this.onCategoriaClick(category, value, index);
      },
    });

    console.log('Total por categoria:', this.totalPorCategoria);
  }

  onCategoriaClick(categoriaLabel: string, valor: number, index: number) {
    this.calcularDadosPorTipoMovimentacao(categoriaLabel);
  }

  onBancoClick(bancoLabel: string, valor: number, index: number) {
    this.calcularDadosPorBanco(bancoLabel);
    this.calculaDadosPorCategoria(bancoLabel);
    this.calcularDadosPorTipoMovimentacao('', bancoLabel);
  }

  calcularDadosPorTipoMovimentacao(categoriaLabel: string, bancoLabel: string = '') {

    var itensCategorias = categoriaLabel == '' ? this.extratoItems : this.extratoItems.filter((item) => item.categoria?.name === categoriaLabel);

    if (bancoLabel !== '') {
      itensCategorias = itensCategorias.filter((item) => item.banco?.nomeBanco === bancoLabel);
    }

    const map = new Map<string, number>();

    for (const item of itensCategorias) {
      const nome = item.tipoMovimentacao?.nomeTipoMovimentacao ?? 'Não vinculado';
      const valor = toNumber(item.valor);
      map.set(nome, (map.get(nome) ?? 0) + valor);
    }

    this.totalPorTipoMovimentacao = Array.from(map.entries())
      .filter(([, v]) => v > 0)
      .sort((a, b) => b[1] - a[1]);

    const totais = this.totalPorTipoMovimentacao.map(([, v]) => v);
    const totalMes = totais.reduce((acc, v) => acc + v, 0);

    // Label com percentual
    const tipoMovimentacao = this.totalPorTipoMovimentacao.map(([nome]) => {
      return nome;
    });

    // Ajusta altura dinamicamente (opcional)
    const height = Math.max(240, tipoMovimentacao.length * 34);
    const percentuais = this.totalPorTipoMovimentacao.map(([, valor]) =>
      totalMes > 0 ? (valor / totalMes) * 100 : 0
    );
    if (tipoMovimentacao.length === 0) {
      this.gastosPorTipoMovimentacao = {} as ApexChartOptions;
      return;
    }

    this.gastosPorTipoMovimentacao = createGastosBarLikeImageChart({
      seriesName: 'Gastos do mês',
      data: totais,
      categories: tipoMovimentacao,
      height: height,
      tooltipTheme: 'light',
      showLegend: false,
      // eixo X em moeda
      xLabelFormatter: (v) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v),
      // ✅ tooltip em moeda + percentual
      tooltipValueFormatter: (v, i) =>
        `${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)} (${percentuais[i].toFixed(1)}%)`,

    });
  }

  calcularDadosPorBanco(bancoLabel: string) {

    var itensBancos = bancoLabel == '' ? this.extratoItems : this.extratoItems.filter((item) => item.banco?.nomeBanco === bancoLabel);

    const map = new Map<string, number>();

    for (const item of itensBancos) {
      const nome = item.tipoMovimentacao?.nomeTipoMovimentacao ?? 'Não vinculado';
      const valor = toNumber(item.valor);
      map.set(nome, (map.get(nome) ?? 0) + valor);
    }

    this.totalPorTipoMovimentacao = Array.from(map.entries())
      .filter(([, v]) => v > 0)
      .sort((a, b) => b[1] - a[1]);

    const totais = this.totalPorTipoMovimentacao.map(([, v]) => v);
    const totalMes = totais.reduce((acc, v) => acc + v, 0);

    // Label com percentual
    const tipoMovimentacao = this.totalPorTipoMovimentacao.map(([nome]) => {
      return nome;
    });

    // Ajusta altura dinamicamente (opcional)
    const height = Math.max(240, tipoMovimentacao.length * 34);
    const percentuais = this.totalPorTipoMovimentacao.map(([, valor]) =>
      totalMes > 0 ? (valor / totalMes) * 100 : 0
    );
    if (tipoMovimentacao.length === 0) {
      this.gastosPorTipoMovimentacao = {} as ApexChartOptions;
      return;
    }

    this.gastosPorTipoMovimentacao = createGastosBarLikeImageChart({
      seriesName: 'Gastos do mês',
      data: totais,
      categories: tipoMovimentacao,
      height: height,
      tooltipTheme: 'light',
      showLegend: false,
      // eixo X em moeda
      xLabelFormatter: (v) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v),
      // ✅ tooltip em moeda + percentual
      tooltipValueFormatter: (v, i) =>
        `${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)} (${percentuais[i].toFixed(1)}%)`,

    });
  }

  back() { this.router.navigateByUrl('/extrato-bancario'); }

}