import { Component, DestroyRef, OnInit, inject } from '@angular/core';
import { ContaMensal } from 'src/app/core/models/conta-mensal.model';
import { ContaMensalService } from 'src/app/core/services/conta-mensal.service';
import { formatCurrencyBR, formatDateInput, isoDate } from 'src/app/core/utils/mask';
import { CategoryService } from 'src/app/core/services/category.service';
import { NaturezaOperacaoLabel } from 'src/app/shared/enums/natureza-operacao.enum';
import { Route, Router } from '@angular/router';
import { CategoriaDto } from 'src/app/core/models/categoria.model';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Observable, catchError, forkJoin, of } from 'rxjs';

/** Painel "Contas vencidas" recolhido; lembrado neste navegador. */
const CHAVE_VENCIDAS_RECOLHIDAS = 'homeVencidasRecolhidas';

function lerVencidasRecolhidas(): boolean {
  try {
    return localStorage.getItem(CHAVE_VENCIDAS_RECOLHIDAS) === 'true';
  } catch {
    return false;
  }
}

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html'
})
export class HomeComponent implements OnInit {
  vencidasRecolhidas = lerVencidasRecolhidas();

  contasProximas: ContaMensal[] = [];
  errorMsg = 'teste'
  totalHoje = '0'
  totalProximas = '0'
  totalVencido = '0';
  contasVencendoHoje: any;
  // categoria: CategoriaDto[] = [];
  contasHoje: { descricao: string; valor: number; categoria: string; tipoConta: string }[] = [];
  proximasContas: { descricao: string; valor: number; categoria: string; tipoConta: string; dataVencimento: Date }[] = [];
  contasVencidas: { descricao: string; valor: number; categoria: string; tipoConta: string; dataVencimento: Date }[] = [];

  constructor(private readonly contaMensalService: ContaMensalService, private readonly categoryService: CategoryService, private readonly router: Router) { }

  // Categorias do usuário, buscadas uma vez. Antes era um GetCategoryById por conta, e a transação
  // antiga sem categoria virava GetCategoryById/0 → 404, que interrompia a seção inteira.
  private categorias = new Map<number, CategoriaDto>();
  private readonly destroyRef = inject(DestroyRef);

  ngOnInit() {
    const hoje = isoDate();
    // Cada seção é independente: uma busca que falha vira lista vazia e não apaga as outras.
    const ouVazio = <T>(busca$: Observable<T[]>) =>
      busca$.pipe(catchError(erro => {
        console.error('Home: falha ao carregar uma seção', erro);
        return of([] as T[]);
      }));

    forkJoin({
      categorias: ouVazio(this.categoryService.listar()),
      vencidas: ouVazio(this.contaMensalService.listarVencidas(hoje)),
      hoje: ouVazio(this.contaMensalService.listarPorData(hoje, true)),
      amanha: ouVazio(this.contaMensalService.listarPorData(isoDate(1), true)),
      depois: ouVazio(this.contaMensalService.listarPorData(isoDate(2), true)),
    })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(({ categorias, vencidas, hoje, amanha, depois }) => {
        this.categorias = new Map(categorias.map(c => [c.id, c]));
        this.montarVencidas(vencidas);
        this.montarVencendoHoje(hoje);
        this.montarProximas([...amanha, ...depois]);
      });
  }

  /** Categoria e tipo da conta; sem categoria, mostra "Sem categoria". */
  private classificar(conta: ContaMensal) {
    const categoria = this.categorias.get(Number(conta.categoriaId));
    return {
      categoria: categoria?.nome || 'Sem categoria',
      tipoConta: categoria ? NaturezaOperacaoLabel[categoria.naturezaOperacao] : 'Sem tipo'
    };
  }

  private emAberto(conta: ContaMensal): boolean {
    return conta.situacao === "PENDENTE" || conta.situacao === "AGUARDANDO";
  }

  private total(itens: { valor: number }[]): string {
    return itens.reduce((total, item) => total + Number(item.valor), 0).toFixed(2);
  }

  private montarVencidas(contas: ContaMensal[]) {
    this.contasVencidas = contas.map(conta => ({
      descricao: conta.nome,
      valor: conta.valor,
      ...this.classificar(conta),
      dataVencimento: conta.data
    }));
    this.totalVencido = this.total(this.contasVencidas);
  }

  private montarVencendoHoje(contas: ContaMensal[]) {
    this.contasHoje = contas.filter(c => this.emAberto(c)).map(conta => ({
      descricao: conta.nome,
      valor: conta.valor,
      ...this.classificar(conta)
    }));
    this.totalHoje = this.total(this.contasHoje);
  }

  private montarProximas(contas: ContaMensal[]) {
    this.contasProximas = contas;
    this.proximasContas = contas.filter(c => this.emAberto(c)).map(conta => ({
      descricao: conta.nome,
      valor: conta.valor,
      ...this.classificar(conta),
      dataVencimento: conta.data
    }));
    this.totalProximas = this.total(this.proximasContas);
  }

  alternarVencidas(): void {
    this.vencidasRecolhidas = !this.vencidasRecolhidas;
    try {
      localStorage.setItem(CHAVE_VENCIDAS_RECOLHIDAS, String(this.vencidasRecolhidas));
    } catch {
      // Sem armazenamento (modo privado etc.): vale só até sair da tela.
    }
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
