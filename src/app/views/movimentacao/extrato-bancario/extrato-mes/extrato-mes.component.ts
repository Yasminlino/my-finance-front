import { Component, DestroyRef, ElementRef, OnInit, ViewChild, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Location, NgIf } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { MenuItem } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { CalendarModule } from 'primeng/calendar';
import { DropdownModule } from 'primeng/dropdown';
import { InputSwitchModule } from 'primeng/inputswitch';
import { SplitButtonModule } from 'primeng/splitbutton';
import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';
import { InputTextModule } from 'primeng/inputtext';
import { MenuModule } from 'primeng/menu';
import { MultiSelectModule } from 'primeng/multiselect';
import { ProgressBarModule } from 'primeng/progressbar';
import { SelectButtonModule } from 'primeng/selectbutton';
import { BadgeModule } from 'primeng/badge';
import { SidebarModule } from 'primeng/sidebar';
import { AcertosComponent } from '../acertos/acertos.component';
import { FaturaPorPessoaComponent } from '../components/fatura-por-pessoa/fatura-por-pessoa.component';
import { ClassificarSempreComponent } from '../classificacao/classificar-sempre.component';
import { ModalRegrasClassificacaoComponent, RegraInicial } from '../classificacao/modal-regras-classificacao.component';
import { PropostaDeRegra, propostasDeRegra } from '../classificacao/classificacao.regras';
import { RegraClassificacaoService } from 'src/app/core/services/regra-classificacao.service';
import { RegraClassificacaoDto } from 'src/app/core/models/regra-classificacao.model';
import { Table, TableModule } from 'primeng/table';
import { TooltipModule } from 'primeng/tooltip';
import { Subject, concat, forkJoin, toArray } from 'rxjs';

import { BancoDto } from 'src/app/core/models/banco.model';
import { CategoriaDto } from 'src/app/core/models/categoria.model';
import { ExtratoItemDto } from 'src/app/core/models/extrato.model';
import { PessoaMovimentacaoDto } from 'src/app/core/models/pessoa-movimentacao.model';
import { TipoCartaoDto } from 'src/app/core/models/tipo-cartao.model';
import { TipoMovimentacaoDto } from 'src/app/core/models/tipo-movimentacao.model';
import { paraExtratoItemDto } from 'src/app/core/models/extrato.mapper';
import { ConfirmacaoService } from 'src/app/core/services/confirmacao.service';
import { ExclusaoEmLoteService, GridSelecionavel } from 'src/app/core/services/exclusao-em-lote.service';
import { LarguraTelaService } from 'src/app/core/services/largura-tela.service';
import { TipoMovimentacaoService } from 'src/app/core/services/tipo-movimentacao.service';
import { TotaisSelecaoComponent } from 'src/app/shared/components/totais-selecao/totais-selecao.component';
import { CurrencyInputDirective } from 'src/app/shared/directives/currency-input.directive';
import { NaturezaLancamento, TotaisSelecao, calcularTotaisSelecao } from 'src/app/shared/utils/totais-selecao';
import { BarraEdicaoComponent } from '../../contas-a-pagar/components/barra-edicao/barra-edicao.component';
import { BancoService } from 'src/app/core/services/banco.service';
import { CategoryService } from 'src/app/core/services/category.service';
import { ExtratoBancarioItemService } from 'src/app/core/services/extrato-bancario-item.service';
import { PessoaMovimentacaoService } from 'src/app/core/services/pessoa-movimentacao.service';
import { TipoCartaoService } from 'src/app/core/services/tipo-cartao.service';
import { extrairMensagemErro } from 'src/app/core/utils/http-error';
import { formatCurrencyBR, formatYearMonth } from 'src/app/core/utils/mask';
import { InputNumberModule } from 'primeng/inputnumber';
import { OverlayPanelModule } from 'primeng/overlaypanel';
import { AlertService } from 'src/app/shared/components/alert.service';
import { EmptyStateComponent } from 'src/app/shared/ui/empty-state/empty-state.component';
import { FilterBarComponent } from 'src/app/shared/ui/filter-bar/filter-bar.component';
import { PageHeaderComponent } from 'src/app/shared/ui/page-header/page-header.component';
import { StatCardComponent } from 'src/app/shared/ui/stat-card/stat-card.component';
import { ultimaBusca } from 'src/app/shared/utils/ultima-busca';
import { ExtratoContasComponent } from '../components/extrato-contas/extrato-contas.component';
import { ExtratoEditarSheetComponent } from '../components/extrato-editar-sheet/extrato-editar-sheet.component';
import { DividirLancamentoComponent } from '../components/dividir-lancamento/dividir-lancamento.component';
import { ResumoCategoriasComponent } from '../resumo/resumo-categorias.component';
import { FabComponent } from 'src/app/shared/ui/fab/fab.component';
import { ModalConfiguracaoVinculoPessoaComponent } from '../components/modal-configuracao-vinculo-pessoa/modal-configuracao-vinculo-pessoa.component';
import { ModalImportacoesMensaisComponent } from '../components/modal-importacoes-mensais/modal-importacoes-mensais.component';
import { ModalImportarExtratoComponent } from '../components/modal-importar-extrato/modal-importar-extrato.component';
import { ModalLancamentoManualComponent } from '../components/modal-lancamento-manual/modal-lancamento-manual.component';
import {
  CampoEditavel, CardsExtrato, ContaDoMes, FaturaPorPessoa, FiltroExtrato, GrupoDoDia, Pendencia, TipoFiltro, agruparPorDia, alteracoesDoRascunho,
  aplicarPessoa, campoAlterado, cardsDoExtrato, contasDoMes, ehDoTitular, ehEntrada, faturaPorPessoa, filtrarExtrato, nomeDaPessoa, nomesParaSugestao, rascunhoDe, semPessoa,
  dividido, tituloCurtoDoDia, OPCOES_ORDEM_EXTRATO, OrdemExtrato, grupoUnico, ordenarExtrato
} from '../extrato.regras';

/** Mês escolhido por último, como no resumo antigo. */
const CHAVE_MES = 'dataFiltroResumo';

const filtroVazio = (bancoId: number | null = null): FiltroExtrato =>
  ({ bancoId, tipo: 'todos', busca: '', pessoas: [], categorias: [], pendencia: null });

/**
 * Extrato Bancário no layout novo (card #45, parte 1): uma tela no lugar do resumo por banco e do detalhe. Contas à
 * esquerda, cards clicáveis, filtros e a tabela agrupada por dia. As regras ficam em extrato.regras.ts.
 */
/** Opções do Todos/Saídas/Entradas. */
const TIPOS: { label: string; value: TipoFiltro }[] = [
  { label: 'Todos', value: 'todos' }, { label: 'Saídas', value: 'saidas' }, { label: 'Entradas', value: 'entradas' }
];

@Component({
  selector: 'app-extrato-mes',
  standalone: true,
  imports: [
    NgIf, FormsModule, ButtonModule, CalendarModule, DropdownModule, InputSwitchModule, SplitButtonModule, IconFieldModule, InputIconModule, InputTextModule, MenuModule,
    InputNumberModule, OverlayPanelModule, MultiSelectModule, ProgressBarModule, SelectButtonModule, BadgeModule, SidebarModule, AcertosComponent, FaturaPorPessoaComponent, ClassificarSempreComponent, ModalRegrasClassificacaoComponent, TableModule, TooltipModule,
    PageHeaderComponent, StatCardComponent, FilterBarComponent, EmptyStateComponent, ExtratoContasComponent,
    ModalImportarExtratoComponent, ModalLancamentoManualComponent, ModalImportacoesMensaisComponent,
    ModalConfiguracaoVinculoPessoaComponent, BarraEdicaoComponent, TotaisSelecaoComponent, CurrencyInputDirective,
    ExtratoEditarSheetComponent, FabComponent, DividirLancamentoComponent, ResumoCategoriasComponent
  ],
  templateUrl: './extrato-mes.component.html',
  styleUrls: ['./extrato-mes.component.scss']
})
export class ExtratoMesComponent implements OnInit, GridSelecionavel {
  private readonly itensService = inject(ExtratoBancarioItemService);
  private readonly bancoService = inject(BancoService);
  private readonly tipoCartaoService = inject(TipoCartaoService);
  private readonly categoryService = inject(CategoryService);
  private readonly pessoaService = inject(PessoaMovimentacaoService);
  private readonly tipoMovimentacaoService = inject(TipoMovimentacaoService);
  private readonly confirmacao = inject(ConfirmacaoService);
  private readonly exclusaoEmLote = inject(ExclusaoEmLoteService);
  readonly movel = inject(LarguraTelaService).movel;
  private readonly alertService = inject(AlertService);
  private readonly router = inject(Router);
  private readonly location = inject(Location);
  private readonly regraService = inject(RegraClassificacaoService);
  private readonly host = inject(ElementRef<HTMLElement>);
  private readonly route = inject(ActivatedRoute);
  private readonly destroyRef = inject(DestroyRef);
  /** Mês pedido ("YYYY-MM"); a carga segue sempre o último (FE-P2-08). */
  private readonly mes$ = new Subject<string>();

  @ViewChild('tabela') tabela?: Table;

  readonly breadcrumb: MenuItem[] = [{ label: 'Movimentações' }, { label: 'Extrato Bancário' }];
  readonly home: MenuItem = { icon: 'pi pi-home', routerLink: '/' };
  readonly itensMenu: MenuItem[] = [
    { label: 'Importações mensais', icon: 'pi pi-download', command: () => (this.showImportacoesMensais = true) },
    { label: 'Relatório mensal', icon: 'pi pi-chart-line', command: () => this.abrirRelatorio() },
    { label: 'Configurar pessoas', icon: 'pi pi-users', command: () => (this.showConfigPessoas = true) },
    { label: 'Regras de classificação', icon: 'pi pi-bolt', command: () => this.abrirRegras() },
    { label: 'Atualizar', icon: 'pi pi-refresh', command: () => this.carregarMes() }
  ];
  /** Desktop, como em Contas a Pagar: o botão é o lançamento manual; a seta traz Importar e o resto. */
  readonly itensNovoLancamento: MenuItem[] = [
    { label: 'Importar extrato', icon: 'pi pi-file-import', command: () => (this.showImportar = true) },
    ...this.itensMenu
  ];
  /** Celular (item 4): o Importar vai para o ⋮; o lançamento manual fica no + flutuante. */
  readonly itensMenuMovel: MenuItem[] = [
    { label: 'Importar extrato', icon: 'pi pi-file-import', command: () => (this.showImportar = true) },
    ...this.itensMenu
  ];
  readonly colunasExportacao = [
    { field: 'dataMovimentacao', header: 'Data' },
    { field: 'descricao', header: 'Descrição' },
    { field: 'categoriaNome', header: 'Categoria' },
    { field: 'nomePessoaTransacao', header: 'Pessoa' },
    { field: 'tipoLancamento', header: 'Tipo' },
    { field: 'valor', header: 'Valor' }
  ];

  dateFilter = new Date();
  selectedMonth = '';
  loading = false;

  itens: ExtratoItemDto[] = [];
  bancos: BancoDto[] = [];
  tiposCartao: TipoCartaoDto[] = [];
  categorias: CategoriaDto[] = [];
  /** Para o lançamento manual: só as ativas. */
  categoriasAtivas: CategoriaDto[] = [];
  pessoasCadastradas: PessoaMovimentacaoDto[] = [];

  filtro: FiltroExtrato = filtroVazio();
  /** "Ordenar por", como em Contas a Pagar: não é filtro, então "Limpar filtros" não mexe nele. */
  ordem: OrdemExtrato = 'data';
  readonly opcoesOrdem = OPCOES_ORDEM_EXTRATO;
  contas: ContaDoMes[] = [];
  cards: CardsExtrato = { saidas: 0, entradas: 0, semPessoa: 0, semCategoria: 0 };
  exibidos: ExtratoItemDto[] = [];
  /** Título e saldo de cada dia, pela data. */
  grupos: Record<string, GrupoDoDia> = {};
  /** Celular: os dias do mais recente para o mais antigo, com os lançamentos de cada um. */
  diasMovel: GrupoDoDia[] = [];
  /** Linha levada pelo lápis (Modo edição): destacada e com o foco no primeiro campo, como em Contas a Pagar. */
  destacado: number | null = null;
  /** Menu ⋮ da linha (leitura). */
  @ViewChild('menuLinha') menuLinha?: { toggle(e: Event): void };
  private linhaDoMenu: ExtratoItemDto | null = null;
  readonly itensMenuLinha: MenuItem[] = [
    { label: 'Dividir', icon: 'pi pi-percentage', command: () => (this.linhaDoMenu ? this.abrirDivisao(this.linhaDoMenu) : undefined) },
    { label: 'Excluir', icon: 'pi pi-trash', command: () => (this.linhaDoMenu ? this.excluirDoSheet(this.linhaDoMenu) : undefined) }
  ];
  /** Celular: o lançamento aberto na folha de baixo. */
  noSheet: ExtratoItemDto | null = null;
  salvandoSheet = false;
  excluindoSheet = false;
  /**
   * Campos recalculados só quando o filtro muda: um getter devolveria objetos novos a cada detecção de mudanças e o
   * p-selectButton / p-multiSelect recriariam as opções no meio do clique (#23).
   */
  /** Como em Contas a Pagar: cada opção mostra quantos lançamentos ela teria com os outros filtros. */
  opcoesTipo: { label: string; value: TipoFiltro; contagem: number }[] = TIPOS.map(t => ({ ...t, contagem: 0 }));
  /** Celular: a folha de baixo com Pessoas e Categorias. */
  filtrosAbertos = false;
  /** Regras de classificação do usuário (card #76): para não propor um texto que já tem regra. */
  regras: RegraClassificacaoDto[] = [];
  /** Tela "Regras de classificação" (⋮). */
  showRegras = false;
  /** Pessoas cadastradas como opções do campo Pessoa da regra. */
  opcoesPessoaRegra: { label: string; value: number }[] = [];
  /** Fila do "Sempre classificar…?" depois de salvar categorias novas. */
  propostas: PropostaDeRegra[] = [];
  /** Aba aberta: 0 = Lançamentos, 1 = Acertos com pessoas (parte 3). */
  aba = 0;
  /** Selo da aba Acertos: o total que falta receber. */
  faltaReceber = 0;
  /** Card "Fatura dividida por pessoa": só com um cartão de crédito escolhido (parte 3, item 6). */
  fatura: FaturaPorPessoa | null = null;
  /** Já devolvido e falta receber das compras desta fatura (pelo pago delas nos Acertos); null enquanto carrega. */
  devolvidoFatura: number | null = null;
  faltaFatura: number | null = null;
  private chaveFatura = '';
  opcoesPessoa: { label: string; value: string }[] = [];
  opcoesCategoria: { label: string; value: number }[] = [];

  // --- Modo edição (item 3), como em Contas a Pagar: edita na tabela e salva em lote ---
  edicao = false;
  rascunho: Record<number, ExtratoItemDto> = {};
  alteracoes = 0;
  salvando = false;
  selecao: ExtratoItemDto[] = [];
  totaisSelecao: TotaisSelecao = { receita: 0, despesa: 0, saldo: 0, count: 0 };
  excluindo = false;
  tiposMovimentacao: TipoMovimentacaoDto[] = [];
  opcoesTipoMov: { label: string; value: number }[] = [];
  /** Sugestões do campo Pessoa: os nomes das pessoas cadastradas. */
  nomesPessoas: string[] = [];
  private originais = new Map<number, ExtratoItemDto>();

  showImportar = false;
  showLancamento = false;
  showImportacoesMensais = false;
  showConfigPessoas = false;

  ngOnInit(): void {
    ultimaBusca(this.mes$, mes => this.itensService.listarDoMes(mes), e => {
      this.loading = false;
      this.alertService.error(extrairMensagemErro(e, 'Erro ao carregar o extrato do mês.'));
    })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(itens => {
        this.itens = Array.isArray(itens) ? itens : [];
        this.loading = false;
        this.originais = new Map(this.itens.map(i => [i.id, i]));
        this.carregarSugestoes();
        if (this.edicao) this.manterRascunho();
        this.selecao = this.selecao.filter(s => this.originais.has(s.id));
        this.aoSelecionar(this.selecao);
        this.recalcular();
      });

    forkJoin({
      bancos: this.bancoService.listar(),
      tipos: this.tipoCartaoService.listar(),
      categorias: this.categoryService.listar(),
      pessoas: this.pessoaService.listar(),
      tiposMov: this.tipoMovimentacaoService.listar()
    })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: ({ bancos, tipos, categorias, pessoas, tiposMov }) => {
          this.tiposMovimentacao = tiposMov ?? [];
          this.opcoesTipoMov = [...this.tiposMovimentacao]
            .sort((a, b) => a.nomeTipoMovimentacao.localeCompare(b.nomeTipoMovimentacao, 'pt-BR'))
            .map(t => ({ label: t.nomeTipoMovimentacao, value: t.id }));
          this.nomesPessoas = nomesParaSugestao(pessoas ?? []);
          this.bancos = bancos ?? [];
          this.opcoesConta = this.bancos.map(b => ({ label: b.nomeBanco, value: b.id }));
          this.tiposCartao = tipos ?? [];
          this.categorias = categorias ?? [];
          this.categoriasAtivas = this.categorias.filter(c => c.ativo !== false);
          this.pessoasCadastradas = pessoas ?? [];
          this.opcoesPessoaRegra = this.pessoasCadastradas
            .map(p => ({ label: p.ehTitular ? 'Eu' : p.nomePessoa, value: p.id }))
            .sort((a, b) => a.label.localeCompare(b.label, 'pt-BR'));
          this.recalcular();
        },
        error: () => this.alertService.info('Falha ao carregar bancos, tipos de conta, categorias, pessoas e tipos de movimentação.')
      });

    // O antigo /detalhes?month=…&bancoId=… redireciona para cá com os mesmos parâmetros.
    const params = this.route.snapshot.queryParamMap;
    const bancoId = Number(params.get('bancoId'));
    this.filtro = filtroVazio(bancoId > 0 ? bancoId : null);
    this.carregarMes(this.mesInicial(params.get('month')));
    this.carregarRegras();
  }

  private mesInicial(daUrl: string | null): Date {
    const [ano, mes] = (daUrl ?? '').split('-').map(Number);
    if (ano && mes) return new Date(ano, mes - 1, 1);
    let salvo: string | null = null;
    try { salvo = localStorage.getItem(CHAVE_MES); } catch { /* sem armazenamento: mês atual */ }
    const data = salvo ? new Date(salvo) : new Date();
    return isNaN(data.getTime()) ? new Date() : data;
  }

  carregarMes(data: Date = this.dateFilter): void {
    if (formatYearMonth(data) !== this.selectedMonth) this.recemClassificados = new Set();
    this.dateFilter = data;
    try { localStorage.setItem(CHAVE_MES, data.toISOString()); } catch { /* só conveniência */ }
    this.selectedMonth = formatYearMonth(data);
    this.loading = true;
    this.mes$.next(this.selectedMonth);
  }

  mudarMes(delta: number): void {
    if (this.edicao) return;
    this.carregarMes(new Date(this.dateFilter.getFullYear(), this.dateFilter.getMonth() + delta, 1));
  }

  /** Aba Acertos aberta pelo "Ver acertos" do card da fatura. */
  verAcertos(): void {
    this.aba = 1;
  }

  private montarFatura(): void {
    const conta = this.contas.find(c => c.bancoId === this.filtro.bancoId);
    if (!conta?.ehCredito) {
      this.fatura = null;
      this.chaveFatura = '';
      return;
    }
    this.fatura = faturaPorPessoa(this.itens.filter(i => i.bancoId === conta.bancoId), this.pessoasCadastradas);
    // Devolvido e falta vêm dos Acertos daquele cartão no mês; só busca de novo quando muda o cartão ou o mês.
    const chave = `${conta.bancoId}|${this.selectedMonth}|${this.itens.length}`;
    if (chave === this.chaveFatura) return;
    this.chaveFatura = chave;
    this.devolvidoFatura = this.faltaFatura = null;
    // Pelas compras desta fatura: o pagamento costuma ser feito em outro mês, então o período não serve aqui.
    const daFatura = new Set(this.itens.filter(i => i.bancoId === conta.bancoId).map(i => i.id));
    this.itensService.acertos({ inicio: null, fim: null, bancoId: conta.bancoId }).subscribe({
      next: a => {
        const compras = a.pessoas.flatMap(p => p.compras).filter(c => daFatura.has(c.id));
        this.devolvidoFatura = Math.round(compras.reduce((s, c) => s + Math.min(c.pago, c.valor), 0) * 100) / 100;
        this.faltaFatura = Math.round(compras.reduce((s, c) => s + Math.max(0, c.valor - c.pago), 0) * 100) / 100;
      },
      error: () => { /* o card fica sem o devolvido; os Acertos avisam o erro */ }
    });
  }

  /** Celular: abre no cartão de maior gasto do mês (mostra o card da fatura); depois vale o que a pessoa escolher. */
  private jaEscolheuConta = false;

  private abrirNoCartaoPrincipal(): void {
    if (this.jaEscolheuConta || !this.movel() || this.filtro.bancoId !== null) return;
    const cartao = this.contas.filter(c => c.ehCredito && c.saidas > 0).sort((a, b) => b.saidas - a.saidas)[0];
    if (!cartao) return;
    this.jaEscolheuConta = true;
    this.filtro = { ...this.filtro, bancoId: cartao.bancoId };
  }

  escolherConta(bancoId: number | null): void {
    this.jaEscolheuConta = true;
    this.filtro = { ...this.filtro, bancoId };
    this.aoMudarFiltro();
  }

  /** Os cards Sem pessoa / Sem categoria ligam e desligam o filtro; Saídas / Entradas trocam o tipo. */
  clicarCard(card: 'saidas' | 'entradas' | Pendencia): void {
    if (card === 'saidas' || card === 'entradas') {
      this.filtro = { ...this.filtro, tipo: this.filtro.tipo === card ? 'todos' : card, pendencia: null };
    } else {
      this.filtro = { ...this.filtro, pendencia: this.filtro.pendencia === card ? null : card };
    }
    this.aoMudarFiltro();
  }

  aoMudarFiltro(): void {
    this.recalcular();
  }

  limparFiltros(): void {
    this.filtro = filtroVazio(this.filtro.bancoId);
    this.aoMudarFiltro();
  }

  /** Celular: quantos filtros estão na folha (o selo do botão). */
  get filtrosNoPainel(): number {
    return (this.filtro.pessoas.length ? 1 : 0) + (this.filtro.categorias.length ? 1 : 0) + (this.temFiltroDeValor ? 1 : 0)
      + (this.filtro.busca.trim() ? 1 : 0) + (this.filtro.pendencia ? 1 : 0);
  }

  get temFiltroDeValor(): boolean {
    return this.filtro.valorMin != null || this.filtro.valorMax != null;
  }

  /** Rótulo do botão Valor, como em Contas a Pagar. */
  get rotuloValor(): string {
    const de = this.filtro.valorMin != null ? formatCurrencyBR(this.filtro.valorMin) : null;
    const ate = this.filtro.valorMax != null ? formatCurrencyBR(this.filtro.valorMax) : null;
    if (de && ate) return `${de} – ${ate}`;
    if (de) return `a partir de ${de}`;
    if (ate) return `até ${ate}`;
    return 'Valor';
  }

  limparValor(): void {
    this.filtro = { ...this.filtro, valorMin: null, valorMax: null };
    this.aoMudarFiltro();
  }

  /** Só a ordem por data mostra os dias. */
  get porData(): boolean {
    return this.ordem === 'data';
  }

  exportar(): void {
    this.tabela?.exportCSV();
  }

  get temFiltro(): boolean {
    const f = this.filtro;
    return f.tipo !== 'todos' || !!f.busca.trim() || f.pessoas.length > 0 || f.categorias.length > 0 || f.pendencia !== null
      || this.temFiltroDeValor;
  }

  private recalcular(): void {
    this.contas = contasDoMes(this.itens, this.bancos, this.tiposCartao);
    this.abrirNoCartaoPrincipal();
    // Os cards contam a conta escolhida, sem os outros filtros: eles mesmos são filtros.
    this.cards = cardsDoExtrato(filtrarExtrato(this.itens, filtroVazio(this.filtro.bancoId)));
    const filtrados = filtrarExtrato(this.itens, this.filtro);
    this.exibidos = ordenarExtrato(filtrados, this.ordem);
    this.montarFatura();
    const contagens = TIPOS.map(t => filtrarExtrato(this.itens, { ...this.filtro, tipo: t.value }).length);
    // Só troca a lista quando um número muda: o p-selectButton redesenha as opções a cada referência nova.
    if (contagens.some((c, i) => c !== this.opcoesTipo[i].contagem)) {
      this.opcoesTipo = TIPOS.map((t, i) => ({ ...t, contagem: contagens[i] }));
    }
    this.grupos = Object.fromEntries(agruparPorDia(filtrados).map(g => [g.data, g]));
    this.diasMovel = this.porData
      ? agruparPorDia(filtrados)
      : grupoUnico(this.exibidos, this.opcoesOrdem.find(o => o.value === this.ordem)?.label ?? '');

    const nomes = [...new Set(this.itens.map(nomeDaPessoa).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'pt-BR'));
    if (nomes.join('|') !== this.opcoesPessoa.map(o => o.value).join('|')) {
      this.opcoesPessoa = nomes.map(nome => ({ label: nome, value: nome }));
    }
    if (this.opcoesCategoria.length !== this.categorias.length) {
      this.opcoesCategoria = [...this.categorias]
        .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'))
        .map(c => ({ label: c.nome, value: c.id }));
    }
  }

  abrirRelatorio(): void {
    this.router.navigate(['extrato-bancario/relatorio'], { queryParams: { month: this.selectedMonth } });
  }

  /** Fechou a importação ou o lançamento manual: recarrega o mês se gravou. */
  /** Mês em que o arquivo recém-importado aparece: a tela vai para ele ao fechar. */
  private mesImportado: string | null = null;

  aoImportarEm(mes: string): void {
    this.mesImportado = mes;
  }

  aoFecharModal(gravou: boolean): void {
    this.showImportar = false;
    this.showLancamento = false;
    const mes = this.mesImportado;
    this.mesImportado = null;
    if (gravou && mes) {
      // Todas as contas: o que acabou de entrar não pode ficar escondido pelo filtro de outra conta.
      this.filtro = { ...this.filtro, bancoId: null };
      const [ano, numero] = mes.split('-').map(Number);
      this.carregarMes(new Date(ano, numero - 1, 1));
    } else if (gravou) {
      this.carregarMes();
    }
  }

  // --- Modo edição ---

  /** Liga com uma cópia do mês; desligar com alterações pendentes pede confirmação. */
  async alternarEdicao(ligar: boolean): Promise<void> {
    if (ligar) {
      this.rascunho = rascunhoDe(this.itens);
      this.alteracoes = 0;
      this.edicao = true;
      return;
    }
    if (this.alteracoes > 0) {
      // Mesmo texto de Contas a Pagar.
      const ok = await this.confirmacao.confirmar(
        this.alteracoes === 1
          ? 'Há 1 lançamento alterado que não foi salvo. Descartar a alteração?'
          : `Há ${this.alteracoes} lançamentos alterados que não foram salvos. Descartar as alterações?`,
        { titulo: 'Descartar alterações', aceitar: 'Descartar', cancelar: 'Continuar editando' });
      if (!ok) {
        this.edicao = true;
        return;
      }
    }
    this.sairDaEdicao();
  }

  private sairDaEdicao(): void {
    this.edicao = false;
    this.rascunho = {};
    this.alteracoes = 0;
    this.aoSelecionar([]);
  }

  /** Recarga no meio da edição (ex.: depois de excluir): mantém o que já foi mexido nos que continuam no mês. */
  private manterRascunho(): void {
    const novo = rascunhoDe(this.itens);
    for (const id of Object.keys(novo).map(Number)) if (this.rascunho[id]) novo[id] = this.rascunho[id];
    this.rascunho = novo;
    this.aoEditar();
  }

  aoEditar(): void {
    this.alteracoes = alteracoesDoRascunho(this.itens, this.rascunho).length;
  }

  editarPessoa(item: ExtratoItemDto, nome: string): void {
    this.rascunho[item.id] = aplicarPessoa(this.rascunho[item.id], nome, this.pessoasCadastradas);
    this.aoEditar();
  }

  alterado(item: ExtratoItemDto, campo: CampoEditavel): boolean {
    return campoAlterado(this.originais.get(item.id), this.rascunho[item.id], campo);
  }

  /** Como em Contas a Pagar: Descartar sai do Modo edição (com alterações, confirma antes). */
  descartarEdicao(): Promise<void> {
    return this.alternarEdicao(false);
  }

  /** Um por vez, na ordem; para no primeiro erro (como o detalhe antigo). */
  salvarEdicao(): void {
    const alterados = alteracoesDoRascunho(this.itens, this.rascunho);
    if (!alterados.length) return;
    const contexto = { categorias: this.categorias, tiposMovimentacao: this.tiposMovimentacao };
    this.salvando = true;
    concat(...alterados.map(item => this.itensService.atualizar(paraExtratoItemDto(item, contexto)))).pipe(toArray()).subscribe({
      next: () => {
        this.salvando = false;
        this.alertService.success(alterados.length === 1 ? '1 alteração salva.' : `${alterados.length} alterações salvas.`);
        const propostas = propostasDeRegra(this.itens, alterados, this.regras);
        this.sairDaEdicao();
        this.carregarMes();
        this.propostas = propostas;
      },
      error: e => {
        this.salvando = false;
        this.alertService.error(extrairMensagemErro(e, 'Erro ao salvar as alterações. Tente novamente.'));
      }
    });
  }

  aoSelecionar(selecao: ExtratoItemDto[]): void {
    this.selecao = selecao ?? [];
    this.totaisSelecao = calcularTotaisSelecao(this.selecao, i => i.valor,
      i => (ehEntrada(i) ? NaturezaLancamento.Receita : NaturezaLancamento.Despesa));
  }

  excluirSelecionados(): void {
    this.exclusaoEmLote
      .confirmarEExcluir(this, this.selecao, item => this.itensService.excluir(item.id), { singular: 'lançamento', plural: 'lançamentos' })
      .subscribe(excluiu => {
        if (excluiu) this.carregarMes();
      });
  }

  /** GridSelecionavel: confirmou a exclusão; o botão fica carregando até terminar. */
  iniciarExclusao(): void {
    this.excluindo = true;
  }

  concluirExclusao(excluiu: boolean): void {
    this.excluindo = false;
    if (excluiu) this.aoSelecionar([]);
  }

  // --- Celular: folha de baixo (item 4) ---

  /** Lápis da linha (desktop), como em Contas a Pagar: liga o Modo edição e leva até o lançamento. */
  editarLinha(item: ExtratoItemDto): void {
    if (!this.edicao) this.alternarEdicao(true);
    this.destacado = item.id;
    setTimeout(() => {
      const linha = this.host.nativeElement.querySelector(`[data-linha="${item.id}"]`) as HTMLElement | null;
      linha?.scrollIntoView({ block: 'center' });
      (linha?.querySelector('input:not([type="checkbox"])') as HTMLElement | null)?.focus();
    });
  }

  abrirMenuLinha(evento: Event, item: ExtratoItemDto): void {
    this.linhaDoMenu = item;
    this.itensMenuLinha[0].visible = !ehEntrada(item);   // só saída se divide
    this.itensMenuLinha[0].label = dividido(item) ? 'Editar divisão' : 'Dividir';
    this.menuLinha?.toggle(evento);
  }

  /** Lançamento aberto no editor de partes (card #76, fase 3). */
  emDivisao: ExtratoItemDto | null = null;

  abrirDivisao(item: ExtratoItemDto): void {
    this.noSheet = null;
    this.emDivisao = item;
  }

  aoFecharDivisao(gravou: boolean): void {
    this.emDivisao = null;
    if (gravou) this.carregarMes();
  }

  readonly opcoesPendencia: { label: string; value: Pendencia }[] = [
    { label: 'Sem pessoa', value: 'sem-pessoa' }, { label: 'Sem categoria', value: 'sem-categoria' }
  ];

  /** Celular: entrada em verde; saída com uma cor fixa por categoria (mesma categoria, mesma cor). */
  corDoIcone(item: ExtratoItemDto, parte: 'bg' | 'fg'): string {
    if (this.entrada(item)) return `var(--mf-cor-verde-${parte})`;
    const nome = this.categoria(item);
    if (!nome) return `var(--mf-cor-cinza-${parte})`;
    const cores = ['rosa', 'laranja', 'azul', 'roxo', 'verde-agua', 'indigo', 'amarelo'];
    const soma = [...nome].reduce((s, c) => s + c.charCodeAt(0), 0);
    return `var(--mf-cor-${cores[soma % cores.length]}-${parte})`;
  }

  /** Quantas pessoas ainda devem (o selo "Acertos" do celular). */
  pessoasComFalta = 0;

  /** "10/11": o dia de vencimento do cartão no mês aberto; vazio se o cartão não tem o dia cadastrado. */
  get venceFatura(): string {
    const dia = this.bancos.find(b => b.id === this.filtro.bancoId)?.diaVencimento;
    if (!dia) return '';
    const [ano, mes] = this.selectedMonth.split('-').map(Number);
    return `${String(Math.min(dia, new Date(ano, mes, 0).getDate())).padStart(2, '0')}/${String(mes).padStart(2, '0')}`;
  }

  get nomeContaEscolhida(): string {
    return this.contas.find(c => c.bancoId === this.filtro.bancoId)?.nome ?? '';
  }

  /** Celular: o título do lançamento é a descrição ou, sem ela, o estabelecimento. */
  tituloDoItem(item: ExtratoItemDto): string {
    return item.descricao || this.pessoa(item) || '(sem descrição)';
  }

  /** Só mostra a pessoa à parte quando ela não é o próprio título. */
  pessoaAParte(item: ExtratoItemDto): string {
    const nome = this.pessoa(item);
    return nome && nome !== this.tituloDoItem(item) ? nome : '';
  }

  tituloDoDiaMovel(dia: GrupoDoDia): string {
    return this.porData ? tituloCurtoDoDia(dia.data) : dia.titulo;
  }

  estaDividido(item: ExtratoItemDto): boolean {
    return dividido(item);
  }

  abrirNoSheet(item: ExtratoItemDto): void {
    this.noSheet = item;
  }

  fecharSheet(): void {
    if (!this.salvandoSheet && !this.excluindoSheet) this.noSheet = null;
  }

  salvarDoSheet(editado: ExtratoItemDto): void {
    const contexto = { categorias: this.categorias, tiposMovimentacao: this.tiposMovimentacao };
    this.salvandoSheet = true;
    this.itensService.atualizar(paraExtratoItemDto(editado, contexto)).subscribe({
      next: () => {
        this.salvandoSheet = false;
        this.noSheet = null;
        this.alertService.success('Lançamento salvo.');
        const propostas = propostasDeRegra(this.itens, [editado], this.regras);
        this.carregarMes();
        this.propostas = propostas;
      },
      error: e => {
        this.salvandoSheet = false;
        this.alertService.error(extrairMensagemErro(e, 'Erro ao salvar o lançamento.'));
      }
    });
  }

  async excluirDoSheet(item: ExtratoItemDto): Promise<void> {
    const ok = await this.confirmacao.confirmar(`Excluir o lançamento "${item.descricao || 'sem descrição'}" de ${formatCurrencyBR(item.valor)}?`,
      { titulo: 'Excluir lançamento' });
    if (!ok) return;
    this.excluindoSheet = true;
    this.itensService.excluir(item.id).subscribe({
      next: () => {
        this.excluindoSheet = false;
        this.noSheet = null;
        this.alertService.success('Lançamento excluído.');
        this.carregarMes();
      },
      error: e => {
        this.excluindoSheet = false;
        this.alertService.error(extrairMensagemErro(e, 'Erro ao excluir o lançamento.'));
      }
    });
  }

  /** Fim da fila do "Criar regra?": se uma regra classificou lançamentos, marca e recarrega o mês. */
  aoConcluirRegras(ids: number[]): void {
    this.propostas = [];
    if (ids?.length) this.aoClassificar(ids);
  }

  /** Contas como opção da regra ("em todas as contas" ou uma). */
  opcoesConta: { label: string; value: number }[] = [];
  /** Regra nova já preenchida ao abrir a tela de regras ("Editar" do "Criar regra?"). */
  regraInicial: RegraInicial | null = null;
  /** Lançamentos que uma regra acabou de classificar: mostram "acabou de ser classificado" até trocar de mês. */
  recemClassificados = new Set<number>();

  abrirRegras(inicial: RegraInicial | null = null): void {
    this.regraInicial = inicial;
    this.showRegras = true;
  }

  /** "Editar" do "Criar regra?": abre a tela de regras com a frase da proposta. */
  editarProposta(p: PropostaDeRegra): void {
    this.abrirRegras({ texto: p.texto, categoriaId: p.categoriaId, tipoMovimentacaoId: p.tipoMovimentacaoId });
  }

  aoClassificar(ids: number[]): void {
    this.recemClassificados = new Set([...this.recemClassificados, ...ids]);
    this.carregarMes();
  }

  acabouDeClassificar(item: ExtratoItemDto): boolean {
    return this.recemClassificados.has(item.id);
  }

  /** Sugestão de categoria do histórico (card #76), pelo id do lançamento sem categoria. */
  sugestoes: Record<number, number> = {};

  /** A sugestão de um lançamento ainda sem categoria (no rascunho, quando em edição). */
  sugestao(item: ExtratoItemDto): { categoriaId: number; nome: string } | null {
    const atual = this.edicao ? this.rascunho[item.id]?.categoriaId : item.categoriaId;
    const categoriaId = this.sugestoes[item.id];
    if (atual || !categoriaId) return null;
    const nome = this.opcoesCategoria.find(c => c.value === categoriaId)?.label;
    if (!nome) return null;
    // Mesmo objeto a cada ciclo: a folha do celular recebe isto como @Input e não deve ver "mudança" à toa.
    const antes = this.sugestoesProntas.get(item.id);
    if (antes?.categoriaId === categoriaId && antes.nome === nome) return antes;
    const nova = { categoriaId, nome };
    this.sugestoesProntas.set(item.id, nova);
    return nova;
  }

  private readonly sugestoesProntas = new Map<number, { categoriaId: number; nome: string }>();

  usarSugestao(item: ExtratoItemDto): void {
    const s = this.sugestao(item);
    if (!s || !this.rascunho[item.id]) return;
    this.rascunho[item.id] = { ...this.rascunho[item.id], categoriaId: s.categoriaId };
    this.aoEditar();
  }

  private carregarSugestoes(): void {
    const ids = this.itens.filter(i => !i.categoriaId).map(i => i.id);
    if (!ids.length) {
      this.sugestoes = {};
      return;
    }
    this.regraService.sugestoes(ids).subscribe({
      next: lista => (this.sugestoes = Object.fromEntries((lista ?? []).map(s => [s.itemId, s.categoriaId]))),
      error: () => (this.sugestoes = {})
    });
  }

  aoCriarRegra(regra: RegraClassificacaoDto): void {
    this.regras = [...this.regras, regra];
  }

  private carregarRegras(): void {
    this.regraService.listar().subscribe({ next: r => (this.regras = Array.isArray(r) ? r : []), error: () => { /* só evita repetir a pergunta */ } });
  }

  /** ‹ do cabeçalho, como em Contas a Pagar. */
  voltar(): void {
    this.location.back();
  }

  get nomeDoMes(): string {
    return this.dateFilter.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
  }

  // --- apresentação da linha ---

  entrada(item: ExtratoItemDto): boolean {
    return ehEntrada(item);
  }

  pessoa(item: ExtratoItemDto): string {
    return nomeDaPessoa(item);
  }

  /** Chip cinza do "Eu" (parte 2). */
  doTitular(item: ExtratoItemDto): boolean {
    return ehDoTitular(item);
  }

  /** Só as saídas pedem pessoa (salário e transferências não). */
  faltaPessoa(item: ExtratoItemDto): boolean {
    return !ehEntrada(item) && semPessoa(item);
  }

  categoria(item: ExtratoItemDto): string {
    if (dividido(item)) {
      const nomes = [...new Set(item.partes!.map(p => p.categoriaNome || 'Sem categoria'))];
      return 'Dividido: ' + nomes.join(', ');
    }
    return item.categoriaNome ?? item.categoria?.nome ?? '';
  }

  parcela(item: ExtratoItemDto): string | null {
    return item.ehParcelado && item.quantidadeParcelas ? `${item.parcelaAtual ?? 1} / ${item.quantidadeParcelas}` : null;
  }

  progresso(item: ExtratoItemDto): number {
    return item.quantidadeParcelas ? Math.min(100, ((item.parcelaAtual ?? 1) / item.quantidadeParcelas) * 100) : 0;
  }

  valor(item: ExtratoItemDto): string {
    return (ehEntrada(item) ? '+ ' : '') + formatCurrencyBR(item.valor);
  }

  moeda(valor: number): string {
    return formatCurrencyBR(valor);
  }

  saldoDoDia(data: string): string {
    const saldo = this.grupos[data]?.saldo ?? 0;
    return (saldo > 0 ? '+ ' : '') + formatCurrencyBR(saldo);
  }
}
