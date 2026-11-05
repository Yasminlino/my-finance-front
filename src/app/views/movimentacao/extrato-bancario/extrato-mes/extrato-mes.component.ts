import { Component, DestroyRef, OnInit, ViewChild, inject } from '@angular/core';
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
import { AlertService } from 'src/app/shared/components/alert.service';
import { EmptyStateComponent } from 'src/app/shared/ui/empty-state/empty-state.component';
import { FilterBarComponent } from 'src/app/shared/ui/filter-bar/filter-bar.component';
import { PageHeaderComponent } from 'src/app/shared/ui/page-header/page-header.component';
import { StatCardComponent } from 'src/app/shared/ui/stat-card/stat-card.component';
import { ultimaBusca } from 'src/app/shared/utils/ultima-busca';
import { ExtratoContasComponent } from '../components/extrato-contas/extrato-contas.component';
import { ExtratoEditarSheetComponent } from '../components/extrato-editar-sheet/extrato-editar-sheet.component';
import { FabComponent } from 'src/app/shared/ui/fab/fab.component';
import { ModalConfiguracaoVinculoPessoaComponent } from '../components/modal-configuracao-vinculo-pessoa/modal-configuracao-vinculo-pessoa.component';
import { ModalImportacoesMensaisComponent } from '../components/modal-importacoes-mensais/modal-importacoes-mensais.component';
import { ModalImportarExtratoComponent } from '../components/modal-importar-extrato/modal-importar-extrato.component';
import { ModalLancamentoManualComponent } from '../components/modal-lancamento-manual/modal-lancamento-manual.component';
import {
  CampoEditavel, CardsExtrato, ContaDoMes, FiltroExtrato, GrupoDoDia, Pendencia, TipoFiltro, agruparPorDia, alteracoesDoRascunho,
  aplicarPessoa, campoAlterado, cardsDoExtrato, contasDoMes, ehDoTitular, ehEntrada, filtrarExtrato, nomeDaPessoa, nomesParaSugestao, rascunhoDe, semPessoa
} from '../extrato.regras';

/** Mês escolhido por último, como no resumo antigo. */
const CHAVE_MES = 'dataFiltroResumo';

const filtroVazio = (bancoId: number | null = null): FiltroExtrato =>
  ({ bancoId, tipo: 'todos', busca: '', pessoas: [], categorias: [], pendencia: null });

/**
 * Extrato Bancário no layout novo (card #45, parte 1): uma tela no lugar do resumo por banco e do detalhe. Contas à
 * esquerda, cards clicáveis, filtros e a tabela agrupada por dia. As regras ficam em extrato.regras.ts.
 */
@Component({
  selector: 'app-extrato-mes',
  standalone: true,
  imports: [
    NgIf, FormsModule, ButtonModule, CalendarModule, DropdownModule, InputSwitchModule, SplitButtonModule, IconFieldModule, InputIconModule, InputTextModule, MenuModule,
    MultiSelectModule, ProgressBarModule, SelectButtonModule, TableModule, TooltipModule,
    PageHeaderComponent, StatCardComponent, FilterBarComponent, EmptyStateComponent, ExtratoContasComponent,
    ModalImportarExtratoComponent, ModalLancamentoManualComponent, ModalImportacoesMensaisComponent,
    ModalConfiguracaoVinculoPessoaComponent, BarraEdicaoComponent, TotaisSelecaoComponent, CurrencyInputDirective,
    ExtratoEditarSheetComponent, FabComponent
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
    { label: 'Exportar', icon: 'pi pi-upload', command: () => this.tabela?.exportCSV() },
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
    ...this.itensMenu.filter(i => i.label !== 'Exportar')
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
  contas: ContaDoMes[] = [];
  cards: CardsExtrato = { saidas: 0, entradas: 0, semPessoa: 0, semCategoria: 0 };
  exibidos: ExtratoItemDto[] = [];
  /** Título e saldo de cada dia, pela data. */
  grupos: Record<string, GrupoDoDia> = {};
  /** Celular: os dias do mais recente para o mais antigo, com os lançamentos de cada um. */
  diasMovel: GrupoDoDia[] = [];
  /** Celular: o lançamento aberto na folha de baixo. */
  noSheet: ExtratoItemDto | null = null;
  salvandoSheet = false;
  excluindoSheet = false;
  /**
   * Campos recalculados só quando o filtro muda: um getter devolveria objetos novos a cada detecção de mudanças e o
   * p-selectButton / p-multiSelect recriariam as opções no meio do clique (#23).
   */
  opcoesTipo: { label: string; value: TipoFiltro }[] = [
    { label: 'Todos', value: 'todos' }, { label: 'Saídas', value: 'saidas' }, { label: 'Entradas', value: 'entradas' }
  ];
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
          this.tiposCartao = tipos ?? [];
          this.categorias = categorias ?? [];
          this.categoriasAtivas = this.categorias.filter(c => c.ativo !== false);
          this.pessoasCadastradas = pessoas ?? [];
          this.recalcular();
        },
        error: () => this.alertService.info('Falha ao carregar bancos, tipos de conta, categorias, pessoas e tipos de movimentação.')
      });

    // O antigo /detalhes?month=…&bancoId=… redireciona para cá com os mesmos parâmetros.
    const params = this.route.snapshot.queryParamMap;
    const bancoId = Number(params.get('bancoId'));
    this.filtro = filtroVazio(bancoId > 0 ? bancoId : null);
    this.carregarMes(this.mesInicial(params.get('month')));
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

  escolherConta(bancoId: number | null): void {
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

  get temFiltro(): boolean {
    const f = this.filtro;
    return f.tipo !== 'todos' || !!f.busca.trim() || f.pessoas.length > 0 || f.categorias.length > 0 || f.pendencia !== null;
  }

  private recalcular(): void {
    this.contas = contasDoMes(this.itens, this.bancos, this.tiposCartao);
    // Os cards contam a conta escolhida, sem os outros filtros: eles mesmos são filtros.
    this.cards = cardsDoExtrato(filtrarExtrato(this.itens, filtroVazio(this.filtro.bancoId)));
    this.exibidos = filtrarExtrato(this.itens, this.filtro);
    this.grupos = Object.fromEntries(agruparPorDia(this.exibidos).map(g => [g.data, g]));
    this.diasMovel = agruparPorDia([...this.exibidos].sort((a, b) => b.dataMovimentacao.localeCompare(a.dataMovimentacao)));

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
  aoFecharModal(gravou: boolean): void {
    this.showImportar = false;
    this.showLancamento = false;
    if (gravou) this.carregarMes();
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
      const ok = await this.confirmacao.confirmar(
        `Sair do Modo edição e descartar ${this.alteracoes === 1 ? 'a alteração' : `as ${this.alteracoes} alterações`}?`,
        { titulo: 'Descartar alterações' });
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

  descartarEdicao(): void {
    this.rascunho = rascunhoDe(this.itens);
    this.aoEditar();
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
        this.sairDaEdicao();
        this.carregarMes();
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
        this.carregarMes();
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
