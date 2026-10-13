import { Component, OnInit } from '@angular/core';
import { ContaMensal } from 'src/app/core/models/conta-mensal.model';
import { ContaMensalService } from 'src/app/core/services/conta-mensal.service';
import { formatCurrencyBR, formatDateInput, isoDate } from 'src/app/core/utils/mask';
import { Category, CategoryService } from 'src/app/core/services/category.service';
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

  // Categorias do usuário, buscadas uma vez. Antes era um GetCategoryById por conta, e a transação
  // antiga sem categoria virava GetCategoryById/0 → 404, que interrompia a seção inteira.
  private categorias = new Map<number, Category>();

  async ngOnInit() {
    const categorias = await this.categoryService.list();
    this.categorias = new Map(categorias.map(c => [c.id, c]));

    this.buscaContasVencidas()
    this.buscaContasVencendoHoje()
    this.buscaContasVencendoAmanha()
  }

  /** Categoria e tipo da conta; sem categoria, mostra "Sem categoria". */
  private classificar(conta: ContaMensal) {
    const categoria = this.categorias.get(Number(conta.categoryId));
    return {
      categoria: categoria?.name || 'Sem categoria',
      tipoConta: categoria ? NaturezaOperacaoLabel[categoria.naturezaOperacao] : 'Sem tipo'
    };
  }

  async buscaContasVencidas() {
    const hoje = isoDate();
    var contas = await this.contaMensalService.BuscaContasVencidas(hoje);

    const resultado = contas.map(conta => ({
      descricao: conta.name,
      valor: conta.value,
      ...this.classificar(conta),
      dataVencimento: conta.date
    }));

    this.contasVencidas = resultado;

    this.totalVencido = resultado
      .reduce((total, item) => total + Number(item.valor), 0)
      .toFixed(2);
  }

  async buscaContasVencendoHoje() {
    const hoje = isoDate();

    var contas = await this.contaMensalService.GetTransactionByDate(hoje, true);

    const resultado = contas
      .filter(conta => conta.status === "PENDENTE" || conta.status === "AGUARDANDO")
      .map(conta => ({
        descricao: conta.name,
        valor: conta.value,
        ...this.classificar(conta)
      }));

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

    const resultado = this.contasProximas
      .filter(conta => conta.status === "PENDENTE" || conta.status === "AGUARDANDO")
      .map(conta => ({
        descricao: conta.name,
        valor: conta.value,
        ...this.classificar(conta),
        dataVencimento: conta.date
      }));

    this.proximasContas = resultado;

    this.totalProximas = resultado
      .reduce((total, item) => total + Number(item.valor), 0)
      .toFixed(2);
  }

  redirecionaContas(dataVencimento?: any) {
    const params: any = {
      date: formatDateInput(dataVencimento) || isoDate(),
    };

    this.router.navigate(['contas-a-pagar'], { queryParams: params });
  }

  money(v: any) {
    // Os totais chegam como string de toFixed(2) ("60.00"); formatCurrencyBR lê texto em pt-BR
    // (ponto = milhar) e mostraria R$ 6.000,00. Number() é o que o antigo formatMoney fazia.
    return formatCurrencyBR(Number(v));
  }
}
