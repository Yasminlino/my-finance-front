import { Component, Input, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ApexChartOptions } from 'src/app/core/components/charts/apex-chart/apex-chart.component';
import { createGastosBarLikeImageChart } from 'src/app/core/components/charts/gastos-bar-like-image.chart';
import { ExtratoBancarioItemService } from 'src/app/core/services/extrato-bancario-item.service';
import { NaturezaOperacao } from 'src/app/shared/enums/natureza-operacao.enum';
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
  extratoItemsSaida: any[] = [];
  extratoItemsEntrada: any[] = [];
  meses = Meses;

  totalEntrada = 0;
  totalSaida = 0;

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

  bancoSelecionado: string = '';
  categoriaSelecionada: string = '';

  filtroMes: string = '';
  filtroTipo: 'Todos' | 'Entrada' | 'Saída' = 'Todos';

  metodoContabil = {
    series: [0, 0, 0],
    labels: ['Essencial', 'Lazer', 'Investimentos'],
    colors: ['#0282b4', '#FF4560', '#00b919'],
  };


  constructor(private extratoItemService: ExtratoBancarioItemService, private route: ActivatedRoute, private router: Router) { }

  async ngOnInit() {
    this.filtroMes = this.getMonthFilter() ?? '';

    if (!this.filtroMes) {
      console.error('Month filter is required in the URL query parameters');
      return;
    }

    const items = await this.extratoItemService.listExtratos(this.filtroMes);
    this.aplicarFiltros(items);

    this.calculaRegraContabil();
    this.calculaDadosPorBanco();
    this.calculaDadosPorCategoria('');
    this.calcularDadosPorTipoMovimentacao('');
  }

  calculaRegraContabil() {
    this.totalEntrada = this.extratoItemsEntrada.map((item) => toNumber(item.valor)).reduce((acc, v) => acc + v, 0);
    this.totalSaida = this.extratoItemsSaida.map((item) => toNumber(item.valor)).reduce((acc, v) => acc + v, 0);
    const metaTotalEssencial = this.extratoItemsEntrada.map((item) => toNumber(item.valor)).reduce((acc, v) => acc + v, 0) * 0.5;
    const metaTotalLazer = this.extratoItemsEntrada.map((item) => toNumber(item.valor)).reduce((acc, v) => acc + v, 0) * 0.3;
    const metaTotalInvestimentos = this.extratoItemsEntrada.map((item) => toNumber(item.valor)).reduce((acc, v) => acc + v, 0) * 0.2;

    this.metodoContabil = {
      ...this.metodoContabil,
      series: [metaTotalEssencial, metaTotalLazer, metaTotalInvestimentos]
    };

  }

  calculaGatosPorMetodoContabil(tipoCard: string) {
    var totalSaidaMaiorQueMeta = false;
    var porcentagemTotal = 0;
    var totalSaidaPorTipo = 0;

    if (this.totalEntrada === 0 || this.totalSaida === 0) {
      return {
        porcentagem: 0,
        valorPositivo: true,
        totalSaidaPorTipo: 0
      }
    }
    if (tipoCard === 'totalSaida') {
      porcentagemTotal = this.totalSaida > 0 ? (this.totalSaida / this.totalEntrada) * 100 - 100 : 0;
      totalSaidaMaiorQueMeta = this.totalSaida > this.totalEntrada ? false : true;
    } else if (tipoCard === 'totalEssencial') {
      const metaTotalEssencial = this.totalEntrada * 0.5;
      totalSaidaPorTipo = this.somarPorNatureza(NaturezaOperacao.Essencial);
      porcentagemTotal = this.calcularPorcentagem(totalSaidaPorTipo, metaTotalEssencial);
      totalSaidaMaiorQueMeta = totalSaidaPorTipo > metaTotalEssencial ? false : true;
    } else if (tipoCard === 'totalLazer') {
      const metaTotalLazer = this.totalEntrada * 0.3;
      totalSaidaPorTipo = this.somarPorNatureza(NaturezaOperacao.EstilodeVidaLazer);
      porcentagemTotal = this.calcularPorcentagem(totalSaidaPorTipo, metaTotalLazer);
      totalSaidaMaiorQueMeta = totalSaidaPorTipo > metaTotalLazer ? false : true;
    } else if (tipoCard === 'totalInvestimentos') {
      const metaTotalInvestimentos = this.totalEntrada * 0.2;
      totalSaidaPorTipo = this.somarPorNatureza(NaturezaOperacao.ReservaInvestimento);
      porcentagemTotal = this.calcularPorcentagem(totalSaidaPorTipo, metaTotalInvestimentos, true);
      totalSaidaMaiorQueMeta = metaTotalInvestimentos > totalSaidaPorTipo ? false : true;
    }

    const iconProgressing = {
      porcentagem: porcentagemTotal,
      valorPositivo: totalSaidaMaiorQueMeta,
      totalSaidaPorTipo: totalSaidaPorTipo
    }
    return iconProgressing
  }

  private somarPorNatureza(natureza: any): number {
    return this.extratoItemsSaida
      .filter(i => i.categoria?.naturezaOperacao === natureza)
      .reduce((acc, i) => acc + toNumber(i.valor), 0);
  }

  private calcularPorcentagem(total: number, meta: number, ehInvestimento: boolean = false): number {
    if (meta === 0) return 0;
    if (ehInvestimento)
      return total > meta ? (meta / total) * 100 - 100 : (total / meta) * 100 - 100;
    return (total / meta) * 100 - 100;
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

  calculaTotal() {
    return this.extratoItemsSaida.reduce((acc, item) => acc + toNumber(item.valor), 0);
  }
  calculaDadosPorBanco() {
    const mapEntrada = new Map<string, number>();
    const mapSaida = new Map<string, number>();

    // 🔴 SAÍDA
    for (const item of this.extratoItemsSaida) {
      const nome = item.banco?.nomeBanco ?? 'Sem banco';
      const valor = toNumber(item.valor);
      mapSaida.set(nome, (mapSaida.get(nome) ?? 0) + valor);
    }

    // 🟢 ENTRADA
    for (const item of this.extratoItemsEntrada) {
      const nome = item.banco?.nomeBanco ?? 'Sem banco';
      const valor = toNumber(item.valor);
      mapEntrada.set(nome, (mapEntrada.get(nome) ?? 0) + valor);
    }

    // 🔥 junta todos os bancos (entrada + saída)
    const bancos = Array.from(new Set([
      ...mapEntrada.keys(),
      ...mapSaida.keys()
    ]));

    // dados alinhados corretamente
    const entradaData = bancos.map(b => mapEntrada.get(b) ?? 0);
    const saidaData = bancos.map(b => mapSaida.get(b) ?? 0);

    // total para percentual (geralmente usa saída)
    const totalSaida = saidaData.reduce((acc, v) => acc + v, 0);

    const percentuais = saidaData.map(v =>
      totalSaida > 0 ? (v / totalSaida) * 100 : 0
    );

    const height = Math.max(240, bancos.length * 36);

    this.relatorioBanco = createGastosBarLikeImageChart({
      series: [
        { name: 'Entrada', data: entradaData },
        { name: 'Saída', data: saidaData }
      ],
      categories: bancos,
      height,
      tooltipTheme: 'light',
      showLegend: true,

      xLabelFormatter: (v) =>
        new Intl.NumberFormat('pt-BR', {
          style: 'currency',
          currency: 'BRL'
        }).format(v),

      tooltipValueFormatter: (v, i) =>
        `${new Intl.NumberFormat('pt-BR', {
          style: 'currency',
          currency: 'BRL'
        }).format(v)} (${percentuais[i].toFixed(1)}%)`,

      onCategoryClick: (category) => {
        this.onBancoClick(category);
      },
    });

    console.log('Entrada:', mapEntrada);
    console.log('Saída:', mapSaida);
  }

  calculaDadosPorCategoria(bancoLabel: string) {

    const entradaFiltrada = bancoLabel === ''
      ? this.extratoItemsEntrada
      : this.extratoItemsEntrada.filter(i => i.banco?.nomeBanco === bancoLabel);

    const saidaFiltrada = bancoLabel === ''
      ? this.extratoItemsSaida
      : this.extratoItemsSaida.filter(i => i.banco?.nomeBanco === bancoLabel);

    const mapEntrada = new Map<string, number>();
    const mapSaida = new Map<string, number>();

    // 🟢 ENTRADA
    for (const item of entradaFiltrada) {
      const nome = item.categoria?.name ?? 'Sem categoria';
      const valor = toNumber(item.valor);
      mapEntrada.set(nome, (mapEntrada.get(nome) ?? 0) + valor);
    }

    // 🔴 SAÍDA
    for (const item of saidaFiltrada) {
      const nome = item.categoria?.name ?? 'Sem categoria';
      const valor = toNumber(item.valor);
      mapSaida.set(nome, (mapSaida.get(nome) ?? 0) + valor);
    }

    // 🔥 todas categorias (entrada + saída)
    const categorias = Array.from(new Set([
      ...mapEntrada.keys(),
      ...mapSaida.keys()
    ]));

    const entradaData = categorias.map(c => mapEntrada.get(c) ?? 0);
    const saidaData = categorias.map(c => mapSaida.get(c) ?? 0);

    const totalSaida = saidaData.reduce((acc, v) => acc + v, 0);

    const percentuais = saidaData.map(v =>
      totalSaida > 0 ? (v / totalSaida) * 100 : 0
    );

    const height = Math.max(240, categorias.length * 60);

    this.tituloRelarioBanco = "Entrada vs Saída por categoria";

    this.gastosPorCategoria = createGastosBarLikeImageChart({
      series: [
        { name: 'Entrada', data: entradaData },
        { name: 'Saída', data: saidaData }
      ],
      categories: categorias,
      height,
      tooltipTheme: 'light',
      showLegend: true,

      xLabelFormatter: (v) =>
        new Intl.NumberFormat('pt-BR', {
          style: 'currency',
          currency: 'BRL'
        }).format(v),

      tooltipValueFormatter: (v, i) =>
        `${new Intl.NumberFormat('pt-BR', {
          style: 'currency',
          currency: 'BRL'
        }).format(v)} (${percentuais[i].toFixed(1)}%)`,

      onCategoryClick: (category) => {
        this.onCategoriaClick(category);
      },
    });

    console.log('Entrada por categoria:', mapEntrada);
    console.log('Saída por categoria:', mapSaida);
  }

  onCategoriaClick(categoriaLabel: string) {
    this.categoriaSelecionada = categoriaLabel;

    this.calcularDadosPorTipoMovimentacao(
      categoriaLabel,
      this.bancoSelecionado
    );
  }

  onBancoClick(bancoLabel: string) {
    this.bancoSelecionado = bancoLabel;
    this.categoriaSelecionada = '';

    this.calculaDadosPorBanco();
    this.calculaDadosPorCategoria(bancoLabel);
    this.calcularDadosPorTipoMovimentacao('', bancoLabel);
  }

  calcularDadosPorTipoMovimentacao(categoriaLabel: string, bancoLabel: string = '') {

    // 🔹 Filtra ENTRADA
    let entradaFiltrada = categoriaLabel === ''
      ? this.extratoItemsEntrada
      : this.extratoItemsEntrada.filter(i => i.categoria?.name === categoriaLabel);

    // 🔹 Filtra SAÍDA
    let saidaFiltrada = categoriaLabel === ''
      ? this.extratoItemsSaida
      : this.extratoItemsSaida.filter(i => i.categoria?.name === categoriaLabel);

    if (bancoLabel !== '') {
      entradaFiltrada = entradaFiltrada.filter(i => i.banco?.nomeBanco === bancoLabel);
      saidaFiltrada = saidaFiltrada.filter(i => i.banco?.nomeBanco === bancoLabel);
    }

    // 🔹 Maps separados
    const mapEntrada = new Map<string, number>();
    const mapSaida = new Map<string, number>();

    // 🔹 Entrada
    for (const item of entradaFiltrada) {
      const nome = item.tipoMovimentacao?.nomeTipoMovimentacao ?? 'Não vinculado';
      mapEntrada.set(nome, (mapEntrada.get(nome) ?? 0) + toNumber(item.valor));
    }

    // 🔹 Saída
    for (const item of saidaFiltrada) {
      const nome = item.tipoMovimentacao?.nomeTipoMovimentacao ?? 'Não vinculado';
      mapSaida.set(nome, (mapSaida.get(nome) ?? 0) + toNumber(item.valor));
    }

    // 🔹 União dos tipos
    const tipos = Array.from(new Set([
      ...mapEntrada.keys(),
      ...mapSaida.keys()
    ]));

    if (tipos.length === 0) {
      this.gastosPorTipoMovimentacao = {} as ApexChartOptions;
      return;
    }

    // 🔹 Dados
    const entradaData = tipos.map(t => mapEntrada.get(t) ?? 0);
    const saidaData = tipos.map(t => mapSaida.get(t) ?? 0);

    // 🔹 Percentual baseado na SAÍDA (mantendo seu padrão)
    const totalSaida = saidaData.reduce((acc, v) => acc + v, 0);

    const percentuais = saidaData.map(v =>
      totalSaida > 0 ? (v / totalSaida) * 100 : 0
    );

    const height = Math.max(240, tipos.length * 60);

    this.gastosPorTipoMovimentacao = createGastosBarLikeImageChart({
      series: [
        { name: 'Entrada', data: entradaData },
        { name: 'Saída', data: saidaData }
      ],
      categories: tipos,
      height,
      tooltipTheme: 'light',
      showLegend: true,

      xLabelFormatter: (v) =>
        new Intl.NumberFormat('pt-BR', {
          style: 'currency',
          currency: 'BRL'
        }).format(v),

      tooltipValueFormatter: (v, i) =>
        `${new Intl.NumberFormat('pt-BR', {
          style: 'currency',
          currency: 'BRL'
        }).format(v)} (${percentuais[i].toFixed(1)}%)`
    });
  }

  calcularTipoMovimentacaoPorBanco(bancoLabel: string) {

    var itensBancos = bancoLabel == '' ? this.extratoItemsSaida : this.extratoItemsSaida.filter((item) => item.banco?.nomeBanco === bancoLabel);

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
    const height = Math.max(240, tipoMovimentacao.length * 60);
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

  aplicarFiltros(items: any[]) {

    // 🔹 filtro por tipo
    let filtrados = items;

    if (this.filtroTipo === 'Entrada') {
      filtrados = items.filter(i => i.tipoLancamento === 'Entrada');
    } else if (this.filtroTipo === 'Saída') {
      filtrados = items.filter(i => i.tipoLancamento === 'Saída');
    }

    // 🔹 separa novamente
    this.extratoItemsEntrada = filtrados.filter(i => i.tipoLancamento === 'Entrada');
    this.extratoItemsSaida = filtrados.filter(i => i.tipoLancamento === 'Saída');

    // 🔹 recalcula tudo
    this.calculaRegraContabil();
    this.calculaDadosPorBanco();
    this.calculaDadosPorCategoria(this.bancoSelecionado);
    this.calcularDadosPorTipoMovimentacao(
      this.categoriaSelecionada,
      this.bancoSelecionado
    );
  }

  onFiltroChange() {
    if (!this.filtroMes) return;

    this.extratoItemService.listExtratos(this.filtroMes).then(items => {
      this.aplicarFiltros(items);
    });
  }

  back() { this.router.navigateByUrl('/extrato-bancario'); }

}