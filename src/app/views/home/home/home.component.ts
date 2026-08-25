import { Component, OnInit } from '@angular/core';
import { ContaMensal } from 'src/app/core/models/conta-mensal.model';
import { ContaMensalService } from 'src/app/core/services/conta-mensal.service';
import { formatDateInput, formatMoney, isoDate, isoDateMinusHours } from 'src/app/core/utils/mask';
import { CategoryService } from 'src/app/core/services/category.service';
import { NaturezaOperacaoLabel } from 'src/app/shared/enums/natureza-operacao.enum';
import { Route, Router } from '@angular/router';

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss']
})
export class HomeComponent implements OnInit {
  contasProximas: ContaMensal[] = [];
  errorMsg = 'teste'
  totalHoje = '0'
  totalProximas = '0'
  totalVencido = '0';
  contasVencendoHoje: any;
  // categoria: Category[] = [];
  contasHoje: { descricao: string; valor: number; categoria: string; tipoConta: string }[] = [];
  proximasContas: { descricao: string; valor: number; categoria: string; tipoConta: string; dataVencimento: Date }[] = [];
  contasVencidas: { descricao: string; valor: number; categoria: string; tipoConta: string; dataVencimento: Date }[] = [];

  constructor(private readonly contaMensalService: ContaMensalService, private readonly categoryService: CategoryService, private readonly router: Router) { }

  ngOnInit() {
    this.buscaContasVencidas()
    this.buscaContasVencendoHoje()
    this.buscaContasVencendoAmanha()
  }

  
  async buscaContasVencidas() {
    const hoje = isoDate();
    var contas = await this.contaMensalService.BuscaContasVencidas(hoje);

    const resultado = [];

    for (const conta of contas) {
      if (Number(conta?.categoryId) != 0 || Number(conta?.categoryId)!= null ) {

        const categoria = await this.categoryService.GetCategoryById(Number(conta.categoryId));

        resultado.push({
          descricao: conta.name,
          valor: conta.value,
          categoria: categoria?.name || 'Sem categoria',
          tipoConta: NaturezaOperacaoLabel[categoria.naturezaOperacao],
          dataVencimento: conta.date
        });
      }
    }

    this.contasVencidas = resultado;

    this.totalVencido = resultado
      .reduce((total, item) => total + Number(item.valor), 0)
      .toFixed(2);
  }

  async buscaContasVencendoHoje() {
    const hoje = isoDate();

    var contas = await this.contaMensalService.GetTransactionByDate(hoje, true);

    const resultado = [];

    for (const conta of contas) {
      var diaVencimento = new Date(conta.date).getDay
      if ((conta.status === "PENDENTE" || conta.status === "AGUARDANDO") && diaVencimento == new Date().getDay && conta.categoryId != null && conta.categoryId != 0 ) {

        const categoria = await this.categoryService.GetCategoryById(Number(conta.categoryId));

        resultado.push({
          descricao: conta.name,
          valor: conta.value,
          categoria: categoria?.name || 'Sem categoria',
          tipoConta: NaturezaOperacaoLabel[categoria.naturezaOperacao]
        });
      }
    }

    this.contasHoje = resultado;

    this.totalHoje = resultado
      .reduce((total, item) => total + Number(item.valor), 0)
      .toFixed(2);
  }

  async buscaContasVencendoAmanha() {
    const amanha = isoDate(1);
    const depois = isoDate(2);

    var contas = await this.contaMensalService.GetTransactionByDate(amanha, true);
    var contas2 = await this.contaMensalService.GetTransactionByDate(depois, true);

    this.contasProximas.push(...contas)
    this.contasProximas.push(...contas2)

    const resultado = [];

    for (const conta of this.contasProximas) {
      if ((conta.status === "PENDENTE" || conta.status === "AGUARDANDO" && conta.categoryId != null && conta.categoryId != 0)) {

        const categoria = await this.categoryService.GetCategoryById(Number(conta.categoryId));

        resultado.push({
          descricao: conta.name,
          valor: conta.value,
          categoria: categoria?.name || 'Sem categoria',
          tipoConta: NaturezaOperacaoLabel[categoria.naturezaOperacao],
          dataVencimento: conta.date
        });
      }
    }

    this.proximasContas = resultado;

    this.totalProximas = resultado
      .reduce((total, item) => total + Number(item.valor), 0)
      .toFixed(2);
  }

  redirecionaContas(dataVencimento?: any) {
    const params: any = {
      date: formatDateInput(dataVencimento) || isoDateMinusHours(),
    };

    this.router.navigate(['contas-a-pagar'], { queryParams: params });
  }

  money(v: any) {
    return formatMoney(v);
  }
}
