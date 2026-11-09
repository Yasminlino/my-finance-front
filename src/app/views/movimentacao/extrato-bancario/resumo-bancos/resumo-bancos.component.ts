import { NgStyle } from '@angular/common';
import { BadgeModule } from 'primeng/badge';
import { DropdownModule } from 'primeng/dropdown';
import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';
import { InputTextModule } from 'primeng/inputtext';
import { SplitButtonModule } from 'primeng/splitbutton';
import { TooltipModule } from 'primeng/tooltip';
import { FilterBarComponent } from 'src/app/shared/ui/filter-bar/filter-bar.component';
import { StatCardComponent } from 'src/app/shared/ui/stat-card/stat-card.component';
import { EvolucaoExtratosMesDto } from 'src/app/core/models/resumo-categorias.model';
import { Component, DestroyRef, OnInit, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { MenuItem, PrimeTemplate } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { CalendarModule } from 'primeng/calendar';
import { MenuModule } from 'primeng/menu';
import { SelectButtonModule } from 'primeng/selectbutton';
import { TagModule } from 'primeng/tag';
import { Subject, catchError, forkJoin, of } from 'rxjs';
import { BancoDto } from 'src/app/core/models/banco.model';
import { CategoriaDto } from 'src/app/core/models/categoria.model';
import { CoberturaImportacoesDto, ExtratoItemDto, ImportacaoDto } from 'src/app/core/models/extrato.model';
import { PessoaMovimentacaoDto } from 'src/app/core/models/pessoa-movimentacao.model';
import { TipoCartaoDto } from 'src/app/core/models/tipo-cartao.model';
import { BancoService } from 'src/app/core/services/banco.service';
import { CategoryService } from 'src/app/core/services/category.service';
import { ExtratoBancarioItemService } from 'src/app/core/services/extrato-bancario-item.service';
import { ExtratoBancarioService } from 'src/app/core/services/extrato-bancario.service';
import { LarguraTelaService } from 'src/app/core/services/largura-tela.service';
import { PessoaMovimentacaoService } from 'src/app/core/services/pessoa-movimentacao.service';
import { TipoCartaoService } from 'src/app/core/services/tipo-cartao.service';
import { extrairMensagemErro } from 'src/app/core/utils/http-error';
import { formatCurrencyBR, formatYearMonth } from 'src/app/core/utils/mask';
import { AlertService } from 'src/app/shared/components/alert.service';
import { EmptyStateComponent } from 'src/app/shared/ui/empty-state/empty-state.component';
import { FabComponent } from 'src/app/shared/ui/fab/fab.component';
import { PageHeaderComponent } from 'src/app/shared/ui/page-header/page-header.component';
import { ultimaBusca } from 'src/app/shared/utils/ultima-busca';
import { ModalConfiguracaoVinculoPessoaComponent } from '../components/modal-configuracao-vinculo-pessoa/modal-configuracao-vinculo-pessoa.component';
import { corDoBanco, dataCurta, siglaDoBanco } from '../components/modal-importacoes-mensais/importacoes.regras';
import { ModalImportacoesMensaisComponent } from '../components/modal-importacoes-mensais/modal-importacoes-mensais.component';
import { ModalImportarExtratoComponent } from '../components/modal-importar-extrato/modal-importar-extrato.component';
import { ModalLancamentoManualComponent } from '../components/modal-lancamento-manual/modal-lancamento-manual.component';
import { CardBanco, FiltroBancos, OrdemBancos, contarPendencias, filtrarBancos, montarCardsBancos, ordenarBancos } from './resumo-bancos.regras';

/** Porta de entrada do extrato: um card por banco, que abre o Extrato dele no mês (card #62). */
@Component({
  selector: 'app-resumo-bancos',
  standalone: true,
  imports: [
    NgStyle, FormsModule, PrimeTemplate, BadgeModule, DropdownModule, IconFieldModule, InputIconModule, InputTextModule, SplitButtonModule, TooltipModule, FilterBarComponent, StatCardComponent, ButtonModule, CalendarModule, MenuModule, SelectButtonModule, TagModule, EmptyStateComponent, FabComponent, PageHeaderComponent,
    ModalImportarExtratoComponent, ModalLancamentoManualComponent, ModalImportacoesMensaisComponent, ModalConfiguracaoVinculoPessoaComponent
  ],
  templateUrl: './resumo-bancos.component.html',
  styleUrl: './resumo-bancos.component.scss'
})
export class ResumoBancosComponent implements OnInit {
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly destroyRef = inject(DestroyRef);
  private readonly alertService = inject(AlertService);
  private readonly itensService = inject(ExtratoBancarioItemService);
  private readonly extratoService = inject(ExtratoBancarioService);
  private readonly bancoService = inject(BancoService);
  private readonly tipoCartaoService = inject(TipoCartaoService);
  private readonly categoryService = inject(CategoryService);
  private readonly pessoaService = inject(PessoaMovimentacaoService);
  readonly movel = inject(LarguraTelaService).movel;
  private readonly mes$ = new Subject<string>();

  readonly breadcrumb: MenuItem[] = [{ label: 'Movimentações' }, { label: 'Resumo de Extratos' }];
  readonly home: MenuItem = { icon: 'pi pi-home', routerLink: '/' };
  opcoesFiltro: { label: string; value: FiltroBancos; contagem: number }[] = [
    { label: 'Todas', value: 'todas', contagem: 0 }, { label: 'Contas', value: 'contas', contagem: 0 }, { label: 'Cartões', value: 'cartoes', contagem: 0 }
  ];
  readonly itensMenu: MenuItem[] = [
    { label: 'Lançamento manual', icon: 'pi pi-plus', command: () => (this.showLancamento = true) },
    { label: 'Importações realizadas', icon: 'pi pi-download', command: () => (this.showImportacoes = true) },
    { label: 'Relatório', icon: 'pi pi-chart-line', command: () => this.abrirRelatorio() },
    { label: 'Configurar pessoas', icon: 'pi pi-users', command: () => (this.showConfigPessoas = true) },
    { label: 'Atualizar', icon: 'pi pi-refresh', command: () => this.recarregar() }
  ];

  dateFilter = new Date();
  selectedMonth = '';
  loading = true;
  filtro: FiltroBancos = 'todas';
  cards: CardBanco[] = [];
  busca = '';
  ordem: OrdemBancos = 'nome';
  readonly opcoesOrdem: { label: string; value: OrdemBancos }[] = [
    { label: 'Nome (A–Z)', value: 'nome' }, { label: 'Maior valor', value: 'valor' },
    { label: 'Mais lançamentos', value: 'lancamentos' }, { label: 'Mais sem categoria', value: 'sem-categoria' }
  ];
  modo: 'cards' | 'lista' = 'cards';
  /** Do mês, sem pagamento de fatura e transferências: os mesmos números do Relatório. */
  totais: EvolucaoExtratosMesDto | null = null;
  pendencias = contarPendencias([]);

  bancos: BancoDto[] = [];
  tiposCartao: TipoCartaoDto[] = [];
  categorias: CategoriaDto[] = [];
  pessoas: PessoaMovimentacaoDto[] = [];
  private itens: ExtratoItemDto[] = [];
  private importacoes: ImportacaoDto[] = [];
  private cobertura: CoberturaImportacoesDto | null = null;
  private compras: ReadonlyMap<number, { valor: number; pago: number }> | null = null;

  showImportar = false;
  showLancamento = false;
  showImportacoes = false;
  showConfigPessoas = false;
  bancoParaImportar: number | null = null;
  private mesImportado: string | null = null;

  readonly sigla = siglaDoBanco;
  readonly dataCurta = dataCurta;

  ngOnInit(): void {
    ultimaBusca(this.mes$, mes => this.itensService.listarDoMes(mes), e => {
      this.loading = false;
      this.alertService.error(extrairMensagemErro(e, 'Erro ao carregar o extrato do mês.'));
    })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(itens => {
        this.itens = Array.isArray(itens) ? itens : [];
        this.loading = false;
        this.recalcular();
      });

    ultimaBusca(this.mes$, mes => this.itensService.evolucao(mes, 1), e => this.alertService.error(extrairMensagemErro(e, 'Erro ao carregar os totais do mês.')))
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(r => (this.totais = r.meses[0] ?? null));

    forkJoin({
      bancos: this.bancoService.listar(),
      tipos: this.tipoCartaoService.listar(),
      categorias: this.categoryService.listarAtivas(),
      pessoas: this.pessoaService.listar()
    })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: ({ bancos, tipos, categorias, pessoas }) => {
          this.bancos = bancos ?? [];
          this.tiposCartao = tipos ?? [];
          this.categorias = categorias ?? [];
          this.pessoas = pessoas ?? [];
          this.recalcular();
        },
        error: e => this.alertService.error(extrairMensagemErro(e, 'Erro ao carregar os bancos.'))
      });

    const [ano, mes] = (this.route.snapshot.queryParamMap.get('month') ?? '').split('-').map(Number);
    if (ano && mes) this.dateFilter = new Date(ano, mes - 1, 1);
    this.recarregar();
  }

  get visiveis(): CardBanco[] {
    return ordenarBancos(filtrarBancos(this.cards, this.filtro, this.busca), this.ordem);
  }

  get normais(): CardBanco[] {
    return this.visiveis.filter(c => !c.falta);
  }

  get faltando(): CardBanco[] {
    return this.visiveis.filter(c => c.falta);
  }

  private plural(n: number, singular: string, varios: string): string {
    return `${n} ${n === 1 ? singular : varios}`;
  }

  get textoContas(): string {
    return this.plural(this.opcoesFiltro[1].contagem, 'conta', 'contas');
  }

  get textoContasECartoes(): string {
    return `${this.textoContas} · ${this.plural(this.opcoesFiltro[2].contagem, 'cartão', 'cartões')}`;
  }

  get nomeMesCurto(): string {
    return this.dateFilter.toLocaleDateString('pt-BR', { month: 'long' });
  }

  comSinal(v: number): string {
    return `${v > 0 ? '+ ' : ''}${formatCurrencyBR(v)}`;
  }

  situacao(c: CardBanco): string {
    if (c.importadoEm) return `Importado ${dataCurta(c.importadoEm)} · ${this.plural(c.quantidade, 'lançamento', 'lançamentos')}`;
    if (c.quantidade) return `Lançamento manual · ${this.plural(c.quantidade, 'item', 'itens')}`;
    return 'Sem lançamentos no mês';
  }

  /** Sem lançamento e sem conta para importar: a lista de bancos zerados não diria o que fazer. */
  get mesVazio(): boolean {
    return !this.loading && !this.itens.length && !this.cards.some(c => c.falta);
  }

  get nomeDoMes(): string {
    return this.dateFilter.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
  }

  moeda(v: number): string {
    return formatCurrencyBR(v);
  }

  estiloBanco(bancoId: number): Record<string, string> {
    const cor = corDoBanco(bancoId);
    return { background: `var(--mf-cor-${cor}-bg)`, color: `var(--mf-cor-${cor}-fg)` };
  }

  mudarMes(delta: number): void {
    this.carregarMes(new Date(this.dateFilter.getFullYear(), this.dateFilter.getMonth() + delta, 1));
  }

  carregarMes(data: Date = this.dateFilter): void {
    this.dateFilter = data;
    this.selectedMonth = formatYearMonth(data);
    this.loading = true;
    // O mês fica na URL para o voltar do Extrato cair nele.
    this.router.navigate([], { relativeTo: this.route, queryParams: { month: this.selectedMonth }, replaceUrl: true });
    this.mes$.next(this.selectedMonth);
  }

  recarregar(): void {
    forkJoin({
      importacoes: this.extratoService.listarImportacoes(null),
      cobertura: this.extratoService.coberturaImportacoes(12),
      // Sem os Acertos o card mostra "—" no Falta receber; o resto da tela segue.
      acertos: this.itensService.acertos({ inicio: null, fim: null, bancoId: null }).pipe(catchError(() => of(null)))
    })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: ({ importacoes, cobertura, acertos }) => {
          this.importacoes = importacoes ?? [];
          this.cobertura = cobertura;
          this.compras = acertos ? new Map(acertos.pessoas.flatMap(p => p.compras).map(c => [c.id, c])) : null;
          this.recalcular();
        },
        error: e => this.alertService.error(extrairMensagemErro(e, 'Erro ao carregar as importações.'))
      });
    this.carregarMes();
  }

  private recalcular(): void {
    this.cards = montarCardsBancos({
      mes: this.selectedMonth, itens: this.itens, bancos: this.bancos, tipos: this.tiposCartao,
      pessoas: this.pessoas, importacoes: this.importacoes, cobertura: this.cobertura, compras: this.compras
    });
    this.pendencias = contarPendencias(this.cards);
    const contagem = { todas: this.cards.length, contas: this.cards.filter(c => !c.ehCredito).length, cartoes: this.cards.filter(c => c.ehCredito).length };
    this.opcoesFiltro = this.opcoesFiltro.map(o => ({ ...o, contagem: contagem[o.value] }));
  }

  abrirExtrato(bancoId: number): void {
    this.router.navigate(['/extrato-bancario'], { queryParams: { month: this.selectedMonth, bancoId } });
  }

  abrirRelatorio(): void {
    this.router.navigate(['/extrato-bancario/relatorio'], { queryParams: { month: this.selectedMonth } });
  }

  abrirImportar(bancoId: number | null = null): void {
    this.showImportacoes = false;
    this.bancoParaImportar = bancoId;
    this.showImportar = true;
  }

  verLancamentos(): void {
    this.showImportacoes = false;
    this.router.navigate(['/extrato-bancario'], { queryParams: { month: this.selectedMonth } });
  }

  aoImportarEm(mes: string): void {
    this.mesImportado = mes;
  }

  aoFecharModal(gravou: boolean): void {
    this.showImportar = false;
    this.showLancamento = false;
    this.bancoParaImportar = null;
    const mes = this.mesImportado;
    this.mesImportado = null;
    if (!gravou) return;
    if (mes) {
      const [ano, numero] = mes.split('-').map(Number);
      this.dateFilter = new Date(ano, numero - 1, 1);
    }
    this.recarregar();
  }
}
