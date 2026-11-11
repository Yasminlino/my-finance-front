import { registrarAcaoCriar } from 'src/app/core/services/criar-contexto.service';
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
import { DialogModule } from 'primeng/dialog';
import { SkeletonModule } from 'primeng/skeleton';
import { ResumoContaDto, ResumoContasDto } from 'src/app/core/models/resumo-categorias.model';
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
import { ImportacaoDto, ExtratoItemDto } from 'src/app/core/models/extrato.model';
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
import { LerNotaComponent } from '../components/ler-nota/ler-nota.component';
import { VerNotaComponent } from '../components/ver-nota/ver-nota.component';
import { FabComponent } from 'src/app/shared/ui/fab/fab.component';
import { ModalConfiguracaoVinculoPessoaComponent } from '../components/modal-configuracao-vinculo-pessoa/modal-configuracao-vinculo-pessoa.component';
import { NovaPessoaComponent } from 'src/app/shared/components/nova-pessoa/nova-pessoa.component';
import { ModalComponent, ModalRodapeDirective } from 'src/app/shared/ui/modal/modal.component';
import { ModalImportacoesMensaisComponent } from '../components/modal-importacoes-mensais/modal-importacoes-mensais.component';
import { AbrirExtrato, ModalImportarExtratoComponent } from '../components/modal-importar-extrato/modal-importar-extrato.component';
import { ModalLancamentoManualComponent } from '../components/modal-lancamento-manual/modal-lancamento-manual.component';
import {
  CampoEditavel, CardsExtrato, ContaDoMes, FaturaPorPessoa, FiltroExtrato, GrupoDoDia, Pendencia, TipoFiltro, agruparPorDia, alteracoesDoRascunho,
  ROTULO_TITULAR, aplicarPessoa, campoAlterado, cardsDoExtrato, contasDoMes, ehDoTitular, ehEntrada, faturaPorPessoa, filtrarExtrato, nomeDaPessoa, opcoesDePessoa, rascunhoDe, semPessoa, usaPessoas, vencimentoNoMes, moedaComSinal,
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
    InputNumberModule, OverlayPanelModule, MultiSelectModule, ProgressBarModule, SelectButtonModule, BadgeModule, SidebarModule, DialogModule, SkeletonModule, AcertosComponent, FaturaPorPessoaComponent, ClassificarSempreComponent, ModalRegrasClassificacaoComponent, TableModule, TooltipModule,
    PageHeaderComponent, StatCardComponent, FilterBarComponent, EmptyStateComponent, ExtratoContasComponent,
    ModalImportarExtratoComponent, ModalLancamentoManualComponent, ModalImportacoesMensaisComponent,
    ModalConfiguracaoVinculoPessoaComponent, NovaPessoaComponent, ModalComponent, ModalRodapeDirective, BarraEdicaoComponent, TotaisSelecaoComponent, CurrencyInputDirective,
    ExtratoEditarSheetComponent, FabComponent, DividirLancamentoComponent, ResumoCategoriasComponent, LerNotaComponent, VerNotaComponent
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
  readonly colunasExportacao = [
    { field: 'dataMovimentacao', header: 'Data' },
    { field: 'descricao', header: 'Descrição' },
    { field: 'categoriaNome', header: 'Categoria' },
    { field: 'nomePessoaTransacao', header: 'Nome no extrato' },
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
    { label: 'Lançar nota', icon: 'pi pi-receipt', command: () => (this.linhaDoMenu ? this.abrirNota(this.linhaDoMenu) : undefined) },
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
          this.bancos = bancos ?? [];
          this.opcoesConta = this.bancos.map(b => ({ label: b.nomeBanco, value: b.id }));
          this.atualizarDetalhe();
          this.tiposCartao = tipos ?? [];
          this.categorias = categorias ?? [];
          this.categoriasAtivas = this.categorias.filter(c => c.ativo !== false);
          this.pessoasCadastradas = pessoas ?? [];
          this.opcoesPessoaRegra = opcoesDePessoa(this.pessoasCadastradas);
          this.recalcular();
        },
        error: () => this.alertService.info('Falha ao carregar bancos, tipos de conta, categorias, pessoas e tipos de movimentação.')
      });

    // O antigo /detalhes?month=…&bancoId=… redireciona para cá com os mesmos parâmetros.
    const params = this.route.snapshot.queryParamMap;
    const bancoId = Number(params.get('bancoId'));
    this.filtro = filtroVazio(bancoId > 0 ? bancoId : null);
    // Atalhos do Importar (card #74) vindos do Resumo.
    this.aplicarFoco(params.get('foco'));
    // "Regras de classificação" do ⋮ da listagem (card #77) abre aqui, onde as opções estão carregadas.
    if (params.get('regras')) this.abrirRegras();
    // "Lançamento" do + do menu e da busca (card #72).
    if (params.get('lancar')) {
      this.lancar(this.filtro.bancoId);
      this.router.navigate([], { relativeTo: this.route, queryParams: { lancar: null }, queryParamsHandling: 'merge', replaceUrl: true });
    }
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
    this.carregarResumo();
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
    this.chipPessoa = '';
    this.filtro = { ...this.filtro, bancoId, pessoas: [], pendencia: this.filtro.pendencia === 'sem-pessoa' ? null : this.filtro.pendencia };
    this.atualizarDetalhe();
    this.aoMudarFiltro();
  }

  // ---------- Card #77: detalhe da conta (mesmos números da listagem, ⋮ do banco, cartão compartilhado ou não) ----------

  /** Números das contas no mês, os mesmos da listagem. */
  resumo: ResumoContasDto | null = null;

  /** "+" do menu no celular (card #72): lançamento nesta conta, já preenchido; o grid traz "em outra conta". */
  private readonly acaoCriar = registrarAcaoCriar({
    chave: 'lancamento',
    titulo: () => !this.contaAberta ? 'Lançamento no extrato' : this.contaAberta.ehCredito ? 'Lançamento neste cartão' : 'Lançamento nesta conta',
    subtitulo: () => {
      const mes = this.dateFilter.toLocaleDateString('pt-BR', { month: 'long' });
      const c = this.contaAberta;
      return !c ? this.nomeDoMes : c.ehCredito ? `${c.nome} · fatura de ${mes}` : `${c.nome} · ${mes}`;
    },
    icone: 'pi pi-plus', cor: 'azul', executar: () => this.lancar(this.filtro.bancoId),
    emOutraConta: () => !!this.contaAberta,
    locais: { lancamento: () => this.lancar(null), importar: () => this.abrirImportar() }
  });
  menuDetalhe: MenuItem[] = [];
  menuSplit: MenuItem[] = [];
  breadcrumbAtual: MenuItem[] = [];
  opcoesContaComTodas: { label: string; value: number | null }[] = [];
  opcoesChips: { label: string; value: string }[] = [];
  opcoesQuemUsa: { label: string; value: number }[] = [];
  chipPessoa = '';
  showQuemUsa = false;
  quemUsa: number[] = [];
  acoesAbertas = false;

  private carregarResumo(): void {
    const mes = this.selectedMonth;
    this.itensService.resumoContas(mes).subscribe({
      next: r => {
        if (mes !== this.selectedMonth) return;
        this.resumo = r;
        this.atualizarDetalhe();
      },
      error: () => {
        this.resumo = null;
        this.atualizarDetalhe();
      }
    });
  }

  get contaAberta(): ResumoContaDto | null {
    return this.filtro.bancoId == null ? null : this.resumo?.contas.find(c => c.bancoId === this.filtro.bancoId) ?? null;
  }

  /** Sem banco: todas as contas; com banco: conta corrente, cartão só meu ou cartão emprestado. */
  get variacao(): 'todas' | 'conta' | 'cartao' | 'compartilhado' {
    const c = this.contaAberta;
    if (!c) return 'todas';
    if (!c.ehCredito) return 'conta';
    return c.compartilhado ? 'compartilhado' : 'cartao';
  }

  /** Card #79: quem não empresta cartão (nenhum cartão compartilhado) não vê nada de pessoas. */
  get usaPessoas(): boolean {
    return usaPessoas(this.bancos);
  }

  /** Cartão só meu não mostra nada de pessoas. */
  get mostraPessoa(): boolean {
    return this.usaPessoas && this.variacao !== 'cartao';
  }

  get tituloPagina(): string {
    return this.contaAberta?.nome ?? 'Extrato Bancário';
  }

  /** Resumo do cabeçalho (card #78): "Cartão de crédito · fatura de novembro · fecha 01 · vence 10". */
  get subtituloPagina(): string {
    const c = this.contaAberta;
    const mes = this.dateFilter.toLocaleDateString('pt-BR', { month: 'long' });
    if (!c) return 'Todas as contas';
    const partes = c.ehCredito
      ? [c.tipoNome, `fatura de ${mes}`, ...(c.dataFechamento ? ['fecha ' + diaMes(c.dataFechamento).slice(0, 2)] : []),
        ...(c.dataVencimento ? ['vence ' + diaMes(c.dataVencimento).slice(0, 2)] : [])]
      : [c.tipoNome];
    if (c.compartilhado && c.pessoas.length) partes.push(`com ${juntarNomes(c.pessoas)}`);
    return partes.filter(Boolean).join(' · ');
  }

  /** Chip do cabeçalho compacto: "nov/26". */
  get periodoCurto(): string {
    return `${this.dateFilter.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '')}/${String(this.dateFilter.getFullYear()).slice(2)}`;
  }

  get rotuloImportar(): string {
    return this.contaAberta?.ehCredito ? 'Importar fatura' : 'Importar extrato';
  }

  get kpis(): KpiExtrato[] {
    const r = this.resumo;
    const c = this.contaAberta;
    const m = (v: number | null | undefined) => (v == null ? '—' : this.moeda(v));
    const semCategoria = (n: number | undefined): KpiExtrato => ({
      rotulo: 'Sem categoria', valor: n == null ? '—' : '' + n, icone: 'pi pi-tag', tom: 'neutro', destaque: !!n, acao: 'sem-categoria',
      dica: 'lançamentos para classificar'
    });
    switch (this.variacao) {
      case 'conta':
        return [
          { rotulo: 'Entradas', valor: m(c?.entradas), icone: 'pi pi-arrow-down-left', tom: 'receita', corDoValor: 'receita', acao: 'entradas' },
          { rotulo: 'Saídas', valor: m(c?.saidas), icone: 'pi pi-arrow-up-right', tom: 'despesa', acao: 'saidas' },
          { rotulo: 'Resultado', valor: moedaComSinal(c?.resultado ?? 0), icone: 'pi pi-chart-line', tom: 'info', corDoValor: (c?.resultado ?? 0) < 0 ? 'perigo' : 'receita' },
          semCategoria(c?.semCategoria)
        ];
      case 'cartao':
        return [
          { rotulo: 'Fatura', valor: m(c?.fatura), icone: 'pi pi-credit-card', tom: 'despesa', acao: 'saidas', dica: c?.dataVencimento ? 'vence ' + diaMes(c.dataVencimento) : undefined },
          { rotulo: 'Pagamentos e estornos', valor: m(c?.pagamentosEstornos), icone: 'pi pi-arrow-down-left', tom: 'receita', corDoValor: 'receita', acao: 'entradas' },
          { rotulo: 'Parcelas futuras', valor: m(c?.parcelasQueContinuam), icone: 'pi pi-calendar', tom: 'info', dica: 'nas próximas faturas' },
          semCategoria(c?.semCategoria)
        ];
      case 'compartilhado':
        return [
          { rotulo: 'Fatura', valor: m(c?.fatura), icone: 'pi pi-credit-card', tom: 'despesa', acao: 'saidas', dica: c?.dataVencimento ? 'vence ' + diaMes(c.dataVencimento) : undefined },
          { rotulo: 'Minhas compras', valor: m(c?.minhasCompras), icone: 'pi pi-user', tom: 'neutro' },
          { rotulo: 'De outras pessoas', valor: m(c?.deOutrasPessoas), icone: 'pi pi-users', tom: 'info',
            dica: c?.porPessoa.length ? c.porPessoa.map(p => `${p.nome} ${this.moeda(p.valor)}`).join(' · ') : undefined },
          { rotulo: 'Falta receber', valor: m(c?.faltaReceber), icone: 'pi pi-wallet', tom: 'perigo', corDoValor: c?.faltaReceber ? 'perigo' : null,
            destaque: !!c?.faltaReceber, acao: 'acertos', dica: 'ver acertos' }
        ];
      default:
        return [
          { rotulo: 'Entradas', valor: m(r?.entradas), icone: 'pi pi-arrow-down-left', tom: 'receita', corDoValor: 'receita', acao: 'entradas' },
          { rotulo: 'Saídas', valor: m(r?.saidas), icone: 'pi pi-arrow-up-right', tom: 'despesa', acao: 'saidas' },
          ...(r?.faltaReceber != null ? [{ rotulo: 'Falta receber', valor: m(r.faltaReceber), icone: 'pi pi-wallet', tom: 'perigo' as const,
            corDoValor: r.faltaReceber ? 'perigo' as const : null, acao: 'acertos' as const, dica: 'de outras pessoas' }] : []),
          { ...semCategoria(r?.paraClassificar), rotulo: 'Para classificar' }
        ];
    }
  }

  kpiAtivo(k: KpiExtrato): boolean {
    if (k.acao === 'entradas' || k.acao === 'saidas') return this.filtro.tipo === k.acao;
    return k.acao === 'sem-categoria' && this.filtro.pendencia === 'sem-categoria';
  }

  clicarKpi(k: KpiExtrato): void {
    if (!k.acao) return;
    if (k.acao === 'acertos') this.aba = 1;
    else this.clicarCard(k.acao);
  }

  /** Recalcula o que depende da conta aberta (menus, chips, migalhas); campos, não getters, para o p-menu não renascer a cada ciclo. */
  private atualizarDetalhe(): void {
    const c = this.contaAberta;
    this.opcoesContaComTodas = [{ label: 'Todas as contas', value: null }, ...this.opcoesConta];
    this.breadcrumbAtual = [
      { label: 'Movimentações' },
      { label: 'Extratos', routerLink: '/extrato-bancario/resumo', queryParams: { month: this.selectedMonth } },
      ...(c ? [{ label: c.nome }] : [])
    ];
    this.opcoesChips = c?.compartilhado
      ? [{ label: 'Todos', value: '' }, { label: ROTULO_TITULAR, value: ROTULO_TITULAR }, ...c.pessoas.map(p => ({ label: p, value: p })),
        { label: 'Sem pessoa', value: 'sem-pessoa' }]
      : [];
    if (!this.mostraPessoa && this.aba === 1) this.aba = 0;

    const cartao = !!c?.ehCredito;
    const geral: MenuItem[] = [
      { label: 'Todas as contas', items: [
        { label: 'Lançamento manual', icon: 'pi pi-plus', command: () => this.lancar(null) },
        { label: 'Importações realizadas', icon: 'pi pi-download', command: () => this.abrirImportacoes(null) },
        { label: 'Relatório do mês', icon: 'pi pi-chart-line', command: () => this.abrirRelatorio() }
      ] },
      { label: 'Configurações', items: [
        // Card #79: só para quem empresta cartão.
        ...(this.usaPessoas ? [{ label: 'Pessoas que usam meus cartões', icon: 'pi pi-users', command: () => (this.showConfigPessoas = true) }] : []),
        { label: 'Nomes e regras', icon: 'pi pi-bolt', command: () => this.abrirRegras() }
      ] }
    ];
    const doBanco: MenuItem[] = c ? [
      { label: cartao ? 'Esta fatura' : 'Este mês', items: [
        { label: cartao ? 'Lançamento neste cartão' : 'Lançamento nesta conta', icon: 'pi pi-plus', command: () => this.lancar(c.bancoId) },
        { label: cartao ? 'Importações deste cartão' : 'Importações desta conta', icon: 'pi pi-download', command: () => this.abrirImportacoes(c.bancoId) },
        { label: 'Relatório do mês', icon: 'pi pi-chart-line', command: () => this.abrirRelatorio() },
        { label: 'Exportar CSV', icon: 'pi pi-upload', command: () => this.exportar() }
      ] },
      { label: cartao ? 'Este cartão' : 'Esta conta', items: [
        ...(cartao ? [{ id: 'compartilhar', label: c.compartilhado ? 'Outras pessoas usam este cartão: sim' : 'Outras pessoas usam este cartão: não',
          icon: c.compartilhado ? 'pi pi-users' : 'pi pi-user', command: () => this.alternarCompartilhado() }] : []),
        { label: cartao ? 'Dados do cartão' : 'Dados da conta', icon: 'pi pi-pencil', command: () => this.router.navigate(['/bancos']) },
        { label: 'Regras de classificação', icon: 'pi pi-bolt', command: () => this.abrirRegras() }
      ] }
    ] : geral;
    this.menuDetalhe = [...doBanco, { label: 'Atualizar', icon: 'pi pi-refresh', command: () => this.carregarMes() }];
    // O p-splitButton abre submenus em cascata: lá os grupos viram itens soltos, separados por linha.
    this.menuSplit = this.menuDetalhe.flatMap((g, i) => g.items ? [...(i ? [{ separator: true }] : []), ...g.items] : [{ separator: true }, g]);
  }

  executarAcao(acao: MenuItem): void {
    this.acoesAbertas = false;
    acao.command?.({ originalEvent: undefined, item: acao });
  }

  abrirImportar(): void {
    this.bancoParaImportar = this.filtro.bancoId;
    this.showImportar = true;
  }

  /** null: o lançamento manual escolhe a conta; com banco, já vem nele. */
  bancoDoLancamento: number | null = null;

  private lancar(bancoId: number | null): void {
    this.bancoDoLancamento = bancoId;
    this.showLancamento = true;
  }

  bancoDasImportacoes: number | null = null;

  private abrirImportacoes(bancoId: number | null): void {
    this.bancoDasImportacoes = bancoId;
    this.showImportacoesMensais = true;
  }

  escolherChip(valor: string): void {
    this.chipPessoa = valor;
    const pendencia = valor === 'sem-pessoa' ? 'sem-pessoa' : this.filtro.pendencia === 'sem-pessoa' ? null : this.filtro.pendencia;
    this.filtro = { ...this.filtro, pessoas: valor && valor !== 'sem-pessoa' ? [valor] : [], pendencia };
    this.aoMudarFiltro();
  }

  alternarCompartilhado(): void {
    const c = this.contaAberta;
    if (!c) return;
    if (c.compartilhado) this.salvarCompartilhamento({ compartilhado: false });
    else this.abrirQuemUsa();
  }

  abrirQuemUsa(): void {
    const c = this.contaAberta;
    if (!c) return;
    this.acoesAbertas = false;
    this.opcoesQuemUsa = opcoesDePessoa(this.pessoasCadastradas.filter(p => !p.ehTitular));
    this.quemUsa = this.bancos.find(b => b.id === c.bancoId)?.pessoasIds ?? [];
    this.showQuemUsa = true;
  }

  /** Card #79: pessoa cadastrada ali mesmo no "Quem usa este cartão" já entra escolhida. */
  aoCriarQuemUsa(pessoa: PessoaMovimentacaoDto): void {
    if (!this.pessoasCadastradas.some(p => p.id === pessoa.id)) this.pessoasCadastradas = [...this.pessoasCadastradas, pessoa];
    this.opcoesPessoaRegra = opcoesDePessoa(this.pessoasCadastradas);
    this.opcoesQuemUsa = opcoesDePessoa(this.pessoasCadastradas.filter(p => !p.ehTitular));
    if (!this.quemUsa.includes(pessoa.id)) this.quemUsa = [...this.quemUsa, pessoa.id];
  }

  confirmarQuemUsa(): void {
    if (!this.quemUsa.length) return;
    this.showQuemUsa = false;
    this.salvarCompartilhamento({ compartilhado: true, pessoasIds: [...this.quemUsa] });
  }

  dispensarConvite(): void {
    this.salvarCompartilhamento({ conviteDispensado: true });
  }

  /** Muda na tela na hora (sem recarregar) e confirma pela API; se a API recusar, volta ao que ela diz. */
  private salvarCompartilhamento(dados: { compartilhado?: boolean; pessoasIds?: number[]; conviteDispensado?: boolean }): void {
    const c = this.contaAberta;
    if (!c || !this.resumo) return;
    const nomes = dados.pessoasIds?.map(id => this.pessoasCadastradas.find(p => p.id === id)?.nomePessoa ?? '').filter(Boolean);
    const novo: ResumoContaDto = {
      ...c,
      compartilhado: dados.compartilhado ?? c.compartilhado,
      conviteCompartilharDispensado: dados.conviteDispensado ?? c.conviteCompartilharDispensado,
      pessoas: nomes ?? c.pessoas
    };
    this.resumo = { ...this.resumo, contas: this.resumo.contas.map(x => (x.bancoId === c.bancoId ? novo : x)) };
    this.chipPessoa = '';
    this.filtro = { ...this.filtro, pessoas: [], pendencia: this.filtro.pendencia === 'sem-pessoa' ? null : this.filtro.pendencia };
    this.atualizarDetalhe();
    this.aoMudarFiltro();
    this.bancoService.compartilhar(c.bancoId, dados).subscribe({
      next: () => {
        const banco = this.bancos.find(b => b.id === c.bancoId);
        if (banco) {
          if (dados.compartilhado != null) banco.compartilhado = dados.compartilhado;
          if (dados.pessoasIds) banco.pessoasIds = dados.pessoasIds;
          if (dados.conviteDispensado != null) banco.conviteCompartilharDispensado = dados.conviteDispensado;
        }
        this.carregarResumo();
      },
      error: e => {
        this.alertService.error(extrairMensagemErro(e, 'Não foi possível salvar o compartilhamento do cartão.'));
        this.carregarResumo();
      }
    });
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
    this.importacaoEmFoco = null;
    this.filtro = filtroVazio(this.filtro.bancoId);
    this.aoMudarFiltro();
  }

  /** Celular: quantos filtros estão na folha (o selo do botão). */
  get filtrosNoPainel(): number {
    return (this.filtro.pessoas.length ? 1 : 0) + (this.filtro.categorias.length ? 1 : 0) + (this.temFiltroDeValor ? 1 : 0)
      + (this.filtro.pendencia ? 1 : 0);
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
      || this.temFiltroDeValor || this.filtro.importacaoId != null;
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

  /** Conta preenchida ao abrir o Importar pelo "falta" da cobertura (card #75). */
  bancoParaImportar: number | null = null;
  /** Nome do arquivo quando o extrato mostra só uma importação. */
  importacaoEmFoco: string | null = null;

  abrirImportarDoHistorico(bancoId: number | null): void {
    this.showImportacoesMensais = false;
    this.bancoParaImportar = bancoId;
    this.showImportar = true;
  }

  /** "Ver lançamentos": vai ao mês da importação e mostra só o que veio dela. */
  verLancamentosDaImportacao(i: ImportacaoDto): void {
    this.showImportacoesMensais = false;
    this.jaEscolheuConta = true;
    this.importacaoEmFoco = i.nomeArquivo || i.bancoNome;
    this.filtro = { ...filtroVazio(null), importacaoId: i.id };
    const [ano, numero] = (i.mesReferencia ?? '').split('-').map(Number);
    if (ano && numero) this.carregarMes(new Date(ano, numero - 1, 1));
    else this.aoMudarFiltro();
  }

  limparImportacaoEmFoco(): void {
    this.importacaoEmFoco = null;
    this.filtro = { ...this.filtro, importacaoId: null };
    this.aoMudarFiltro();
  }

  /** Atalho do passo Pronto do Importar (card #74): vai ao mês e banco importados, na aba ou filtro pedido. */
  abrirDoImportar(destino: AbrirExtrato): void {
    this.showImportar = false;
    this.bancoParaImportar = null;
    this.mesImportado = null;
    this.jaEscolheuConta = true;
    this.filtro = filtroVazio(destino.bancoId);
    this.aplicarFoco(destino.foco);
    const [ano, numero] = destino.mes.split('-').map(Number);
    this.carregarMes(new Date(ano, numero - 1, 1));
  }

  private aplicarFoco(foco: string | null): void {
    if (foco === 'sem-categoria') this.filtro = { ...this.filtro, pendencia: 'sem-categoria' };
    this.aba = foco === 'acertos' ? 1 : 0;
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

  editarPessoa(item: ExtratoItemDto, pessoaId: number | null): void {
    this.rascunho[item.id] = aplicarPessoa(this.rascunho[item.id], pessoaId, this.pessoasCadastradas);
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
    this.itensMenuLinha[1].visible = !ehEntrada(item);
    this.itensMenuLinha[1].label = item.temNota ? 'Ver nota' : 'Lançar nota';
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

  /** Card #81: "Sem pessoa" só faz sentido para quem usa pessoas. */
  get pendencias(): { label: string; value: Pendencia }[] {
    return this.mostraPessoa ? this.opcoesPendencia : this.opcoesPendencia.filter(o => o.value !== 'sem-pessoa');
  }

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
    return vencimentoNoMes(this.bancos.find(b => b.id === this.filtro.bancoId)?.diaVencimento, this.selectedMonth);
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

  /** Lançamento com a tela de lançar nota aberta (card #76, fase 6). */
  lancandoNota: ExtratoItemDto | null = null;
  /** Lançamento com a modal da nota aberta. */
  vendoNota: ExtratoItemDto | null = null;

  abrirNota(item: ExtratoItemDto): void {
    this.noSheet = null;
    if (item.temNota) this.vendoNota = item;
    else this.lancandoNota = item;
  }

  /** Salvou: recarrega e já mostra a nota, para conferir. */
  aoLancarNota(salvou: boolean): void {
    const item = this.lancandoNota;
    this.lancandoNota = null;
    if (salvou && item) {
      this.vendoNota = item;
      this.carregarMes();
    }
  }

  aoFecharNota(mudou: boolean): void {
    this.vendoNota = null;
    if (mudou) this.carregarMes();
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
  /** "‹ Todas as contas": a listagem, no mesmo mês (card #77). */
  voltar(): void {
    this.router.navigate(['/extrato-bancario/resumo'], { queryParams: { month: this.selectedMonth } });
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
    return moedaComSinal(saldo);
  }
}

/** Um KPI do topo do detalhe (card #77); a ação liga o filtro ou abre os Acertos. */
interface KpiExtrato {
  rotulo: string;
  valor: string;
  icone: string;
  tom: 'receita' | 'despesa' | 'info' | 'perigo' | 'neutro';
  corDoValor?: 'receita' | 'perigo' | null;
  destaque?: boolean;
  dica?: string;
  acao?: 'entradas' | 'saidas' | 'sem-categoria' | 'acertos';
}

/** "Carlos", "Carlos e Ágatha", "Carlos, Ágatha e Bia". */
function juntarNomes(nomes: readonly string[]): string {
  return nomes.length <= 1 ? nomes.join('') : `${nomes.slice(0, -1).join(', ')} e ${nomes[nomes.length - 1]}`;
}

/** "2026-11-10" → "10/11". */
function diaMes(iso: string): string {
  const [, mes, dia] = iso.split('-');
  return `${dia}/${mes}`;
}
