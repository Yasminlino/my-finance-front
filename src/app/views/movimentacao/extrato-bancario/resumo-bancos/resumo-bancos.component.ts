import { NgStyle } from '@angular/common';
import { Component, DestroyRef, OnInit, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { MenuItem, PrimeTemplate } from 'primeng/api';
import { BadgeModule } from 'primeng/badge';
import { ButtonModule } from 'primeng/button';
import { CalendarModule } from 'primeng/calendar';
import { DropdownModule } from 'primeng/dropdown';
import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';
import { InputTextModule } from 'primeng/inputtext';
import { MenuModule } from 'primeng/menu';
import { SelectButtonModule } from 'primeng/selectbutton';
import { SplitButtonModule } from 'primeng/splitbutton';
import { TagModule } from 'primeng/tag';
import { TooltipModule } from 'primeng/tooltip';
import { Subject, forkJoin } from 'rxjs';
import { BancoDto } from 'src/app/core/models/banco.model';
import { CategoriaDto } from 'src/app/core/models/categoria.model';
import { PessoaMovimentacaoDto } from 'src/app/core/models/pessoa-movimentacao.model';
import { ResumoContaDto, ResumoContasDto } from 'src/app/core/models/resumo-categorias.model';
import { TipoCartaoDto } from 'src/app/core/models/tipo-cartao.model';
import { BancoService } from 'src/app/core/services/banco.service';
import { CategoryService } from 'src/app/core/services/category.service';
import { ExtratoBancarioItemService } from 'src/app/core/services/extrato-bancario-item.service';
import { LarguraTelaService } from 'src/app/core/services/largura-tela.service';
import { PessoaMovimentacaoService } from 'src/app/core/services/pessoa-movimentacao.service';
import { TipoCartaoService } from 'src/app/core/services/tipo-cartao.service';
import { extrairMensagemErro } from 'src/app/core/utils/http-error';
import { formatCurrencyBR, formatYearMonth } from 'src/app/core/utils/mask';
import { AlertService } from 'src/app/shared/components/alert.service';
import { EmptyStateComponent } from 'src/app/shared/ui/empty-state/empty-state.component';
import { FabComponent } from 'src/app/shared/ui/fab/fab.component';
import { FilterBarComponent } from 'src/app/shared/ui/filter-bar/filter-bar.component';
import { PageHeaderComponent } from 'src/app/shared/ui/page-header/page-header.component';
import { StatCardComponent } from 'src/app/shared/ui/stat-card/stat-card.component';
import { ultimaBusca } from 'src/app/shared/utils/ultima-busca';
import { ModalConfiguracaoVinculoPessoaComponent } from '../components/modal-configuracao-vinculo-pessoa/modal-configuracao-vinculo-pessoa.component';
import { corDoBanco, dataCurta, siglaDoBanco } from '../components/modal-importacoes-mensais/importacoes.regras';
import { ModalImportacoesMensaisComponent } from '../components/modal-importacoes-mensais/modal-importacoes-mensais.component';
import { AbrirExtrato, ModalImportarExtratoComponent } from '../components/modal-importar-extrato/modal-importar-extrato.component';
import { ModalLancamentoManualComponent } from '../components/modal-lancamento-manual/modal-lancamento-manual.component';
import { FiltroBancos, NumeroDoCard, OrdemBancos, filtrarBancos, juntarNomes, numerosDoCard, ordenarBancos, semMovimento } from './resumo-bancos.regras';

/**
 * Listagem das contas (cards #62 e #77): KPIs do mês e um card por conta com os mesmos números do topo do detalhe,
 * que abre o Extrato da conta no mês.
 */
@Component({
  selector: 'app-resumo-bancos',
  standalone: true,
  imports: [
    NgStyle, FormsModule, PrimeTemplate, BadgeModule, ButtonModule, CalendarModule, DropdownModule, IconFieldModule, InputIconModule, InputTextModule,
    MenuModule, SelectButtonModule, SplitButtonModule, TagModule, TooltipModule, EmptyStateComponent, FabComponent, FilterBarComponent, PageHeaderComponent,
    StatCardComponent, ModalImportarExtratoComponent, ModalLancamentoManualComponent, ModalImportacoesMensaisComponent, ModalConfiguracaoVinculoPessoaComponent
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
  private readonly bancoService = inject(BancoService);
  private readonly tipoCartaoService = inject(TipoCartaoService);
  private readonly categoryService = inject(CategoryService);
  private readonly pessoaService = inject(PessoaMovimentacaoService);
  readonly movel = inject(LarguraTelaService).movel;
  private readonly mes$ = new Subject<string>();

  readonly breadcrumb: MenuItem[] = [{ label: 'Movimentações' }, { label: 'Extratos' }];
  readonly home: MenuItem = { icon: 'pi pi-home', routerLink: '/' };
  opcoesFiltro: { label: string; value: FiltroBancos; contagem: number }[] = [
    { label: 'Todas', value: 'todas', contagem: 0 }, { label: 'Contas', value: 'contas', contagem: 0 }, { label: 'Cartões', value: 'cartoes', contagem: 0 }
  ];
  readonly opcoesOrdem: { label: string; value: OrdemBancos }[] = [
    { label: 'Nome (A–Z)', value: 'nome' }, { label: 'Maior valor', value: 'valor' },
    { label: 'Mais lançamentos', value: 'lancamentos' }, { label: 'Mais sem categoria', value: 'sem-categoria' }
  ];
  /** ⋮ geral: só ações de todas as contas e configurações (card #77). */
  readonly itensMenu: MenuItem[] = [
    { label: 'Todas as contas', items: [
      { label: 'Lançamento manual', icon: 'pi pi-plus', command: () => (this.showLancamento = true) },
      { label: 'Importações realizadas', icon: 'pi pi-download', command: () => (this.showImportacoes = true) },
      { label: 'Relatório do mês', icon: 'pi pi-chart-line', command: () => this.abrirRelatorio() }
    ] },
    { label: 'Configurações', items: [
      { label: 'Pessoas que usam meus cartões', icon: 'pi pi-users', command: () => (this.showConfigPessoas = true) },
      { label: 'Regras de classificação', icon: 'pi pi-bolt', command: () => this.abrirRegras() }
    ] },
    { separator: true },
    { label: 'Atualizar', icon: 'pi pi-refresh', command: () => this.carregarMes() }
  ];
  /** O p-splitButton abre submenus em cascata: lá os grupos viram itens soltos, separados por linha. */
  readonly itensSplit: MenuItem[] = this.itensMenu.flatMap((g, i) => (g.items ? [...(i ? [{ separator: true }] : []), ...g.items] : [g]));

  dateFilter = new Date();
  selectedMonth = '';
  loading = true;
  filtro: FiltroBancos = 'todas';
  busca = '';
  ordem: OrdemBancos = 'nome';
  modo: 'cards' | 'lista' = 'cards';
  mostrarSemMovimento = false;
  resumo: ResumoContasDto | null = null;

  bancos: BancoDto[] = [];
  tiposCartao: TipoCartaoDto[] = [];
  categorias: CategoriaDto[] = [];
  pessoas: PessoaMovimentacaoDto[] = [];

  showImportar = false;
  showLancamento = false;
  showImportacoes = false;
  showConfigPessoas = false;
  bancoParaImportar: number | null = null;
  private mesImportado: string | null = null;

  readonly sigla = siglaDoBanco;
  readonly dataCurta = dataCurta;
  readonly numeros = numerosDoCard;
  readonly juntarNomes = juntarNomes;

  ngOnInit(): void {
    ultimaBusca(this.mes$, mes => this.itensService.resumoContas(mes), e => {
      this.loading = false;
      this.alertService.error(extrairMensagemErro(e, 'Erro ao carregar o resumo das contas.'));
    })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(r => {
        this.resumo = r;
        this.loading = false;
        const contas = r?.contas ?? [];
        const contagem = { todas: contas.length, contas: contas.filter(c => !c.ehCredito).length, cartoes: contas.filter(c => c.ehCredito).length };
        this.opcoesFiltro = this.opcoesFiltro.map(o => ({ ...o, contagem: contagem[o.value] }));
      });

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
        },
        error: e => this.alertService.error(extrairMensagemErro(e, 'Erro ao carregar os bancos.'))
      });

    const [ano, mes] = (this.route.snapshot.queryParamMap.get('month') ?? '').split('-').map(Number);
    if (ano && mes) this.dateFilter = new Date(ano, mes - 1, 1);
    this.carregarMes();
  }

  private get contas(): ResumoContaDto[] {
    return ordenarBancos(filtrarBancos(this.resumo?.contas ?? [], this.filtro, this.busca), this.ordem);
  }

  /** Com movimento ou com algo a importar; as paradas ficam recolhidas. */
  get visiveis(): ResumoContaDto[] {
    return this.contas.filter(c => this.mostrarSemMovimento || !semMovimento(c));
  }

  get quantasSemMovimento(): number {
    return this.contas.filter(semMovimento).length;
  }

  get mesVazio(): boolean {
    return !this.loading && !!this.resumo && this.resumo.contas.every(semMovimento);
  }

  get nomeDoMes(): string {
    return this.dateFilter.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
  }

  get nomeMesCurto(): string {
    return this.dateFilter.toLocaleDateString('pt-BR', { month: 'long' });
  }

  get existeCompartilhado(): boolean {
    return this.resumo?.faltaReceber != null;
  }

  moeda(v: number): string {
    return formatCurrencyBR(v);
  }

  comSinal(v: number): string {
    return `${v > 0 ? '+ ' : ''}${formatCurrencyBR(v)}`;
  }

  numero(n: NumeroDoCard): string {
    return n.tipo === 'contagem' ? '' + n.valor : n.rotulo === 'Resultado' ? this.comSinal(n.valor) : this.moeda(n.valor);
  }

  estiloBanco(bancoId: number): Record<string, string> {
    const cor = corDoBanco(bancoId);
    return { background: `var(--mf-cor-${cor}-bg)`, color: `var(--mf-cor-${cor}-fg)` };
  }

  subtitulo(c: ResumoContaDto): string {
    if (!c.ehCredito) return [c.agencia && `Ag. ${c.agencia}`, c.numeroConta && `CC ${c.numeroConta}`].filter(Boolean).join(' · ') || c.tipoNome;
    const mes = this.dateFilter.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '');
    if (!c.dataVencimento) return `Fatura ${mes}`;
    const [ano, m, d] = c.dataVencimento.split('-').map(Number);
    const hoje = new Date();
    const dias = Math.round((new Date(ano, m - 1, d).getTime() - new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate()).getTime()) / 86400000);
    return `Fatura ${mes} · vence ${String(d).padStart(2, '0')}/${String(m).padStart(2, '0')}${dias > 0 ? ` (em ${dias} ${dias === 1 ? 'dia' : 'dias'})` : ''}`;
  }

  situacao(c: ResumoContaDto): string {
    const plural = (n: number, um: string, varios: string) => `${n} ${n === 1 ? um : varios}`;
    if (c.importadoEm) return `Importado ${dataCurta(c.importadoEm)} · ${plural(c.quantidade, 'lançamento', 'lançamentos')}`;
    if (c.quantidade) return `Lançamento manual · ${plural(c.quantidade, 'item', 'itens')}`;
    return 'Sem lançamentos no mês';
  }

  avisoFalta(c: ResumoContaDto): string {
    return `${c.ehCredito ? 'Fatura' : 'Extrato'} de ${this.nomeMesCurto} ainda não importad${c.ehCredito ? 'a' : 'o'}`;
  }

  mudarMes(delta: number): void {
    this.carregarMes(new Date(this.dateFilter.getFullYear(), this.dateFilter.getMonth() + delta, 1));
  }

  carregarMes(data: Date = this.dateFilter): void {
    this.dateFilter = data;
    this.selectedMonth = formatYearMonth(data);
    this.loading = true;
    // O mês fica na URL para o "‹ Todas as contas" do Extrato cair nele.
    this.router.navigate([], { relativeTo: this.route, queryParams: { month: this.selectedMonth }, replaceUrl: true });
    this.mes$.next(this.selectedMonth);
  }

  abrirExtrato(bancoId: number): void {
    this.router.navigate(['/extrato-bancario'], { queryParams: { month: this.selectedMonth, bancoId } });
  }

  abrirRelatorio(): void {
    this.router.navigate(['/extrato-bancario/relatorio'], { queryParams: { month: this.selectedMonth } });
  }

  /** As regras moram no Extrato (precisam das categorias, tipos e pessoas carregados lá). */
  abrirRegras(): void {
    this.router.navigate(['/extrato-bancario'], { queryParams: { month: this.selectedMonth, regras: 1 } });
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

  abrirDoImportar(destino: AbrirExtrato): void {
    this.showImportar = false;
    this.router.navigate(['/extrato-bancario'], {
      queryParams: { month: destino.mes, bancoId: destino.bancoId, ...(destino.foco ? { foco: destino.foco } : {}) }
    });
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
    this.carregarMes();
  }
}
