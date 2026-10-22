import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges, ViewChild, inject } from '@angular/core';
import { NgClass, NgIf } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ConfirmationService, MenuItem } from 'primeng/api';
import { BadgeModule } from 'primeng/badge';
import { ButtonModule } from 'primeng/button';
import { CalendarModule } from 'primeng/calendar';
import { DropdownModule } from 'primeng/dropdown';
import { InputNumberModule } from 'primeng/inputnumber';
import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';
import { InputTextModule } from 'primeng/inputtext';
import { Menu, MenuModule } from 'primeng/menu';
import { MultiSelectModule } from 'primeng/multiselect';
import { ProgressBarModule } from 'primeng/progressbar';
import { SelectButtonModule } from 'primeng/selectbutton';
import { Table, TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { ToolbarModule } from 'primeng/toolbar';
import { TooltipModule } from 'primeng/tooltip';

import { LinhaContasMensais } from 'src/app/core/models/conta-mensal.model';
import { GridSelecionavel } from 'src/app/core/services/exclusao-em-lote.service';
import { formatCurrencyBR, formatDateBR, parseCurrencyBR } from 'src/app/core/utils/mask';
import { STATUS_PAGAMENTO_OPTIONS } from 'src/app/shared/enums/status.enum';
import {
  NaturezaLancamento, TotaisSelecao, calcularTotaisSelecao, naturezaPorSubCategoria
} from 'src/app/shared/utils/totais-selecao';
import { FiltroSituacao, previaDoEfeito } from '../../contas-a-pagar.regras';
import {
  MetaLinha, OpcaoFiltro, categoriasDe, filtrarContas, metaDasContas, opcoesDeFiltro, ordenarPorVencimento
} from '../../contas-a-pagar.lista';
import { CampoEditavel, EdicaoContas, RascunhoConta } from '../../edicao-contas';
import { ErroCampoDirective } from '../../erro-campo.directive';

/**
 * Tabela de Contas a Pagar. Filtros (situação, busca, categorias) são feitos aqui sobre o mês
 * inteiro; a seleção é a do p-table (dataKey id), então vale entre páginas. Quem chama a API é a tela.
 */
@Component({
  selector: 'app-tabela-contas',
  standalone: true,
  imports: [
    NgClass, NgIf, FormsModule, TableModule, ToolbarModule, SelectButtonModule, BadgeModule, IconFieldModule,
    InputIconModule, InputTextModule, MultiSelectModule, ButtonModule, TooltipModule, ProgressBarModule,
    TagModule, MenuModule, InputNumberModule, CalendarModule, DropdownModule, ErroCampoDirective
  ],
  templateUrl: './tabela-contas.component.html',
  styleUrls: ['./tabela-contas.component.scss']
})
export class TabelaContasComponent implements OnChanges, GridSelecionavel {
  @ViewChild('dt') dt?: Table;
  @ViewChild('menuLinha') menuLinha?: Menu;
  /** Provido pela tela (ela tem o p-confirmDialog). */
  private readonly confirmacao = inject(ConfirmationService);

  @Input() contas: LinhaContasMensais[] = [];
  @Input() hoje = new Date();
  @Input() loading = false;
  /** Presente quando o modo edição está ligado. */
  @Input() edicao: EdicaoContas | null = null;

  @Output() marcarPago = new EventEmitter<LinhaContasMensais[]>();
  @Output() excluir = new EventEmitter<LinhaContasMensais[]>();
  @Output() editar = new EventEmitter<LinhaContasMensais>();

  filtro: FiltroSituacao = 'todas';
  busca = '';
  categoriasSelecionadas: string[] = [];
  categorias: string[] = [];
  opcoesFiltro: OpcaoFiltro[] = [];

  linhasVisiveis: LinhaContasMensais[] = [];
  /** Contas do mês por vencimento e nome; os filtros partem daqui. */
  private contasOrdenadas: LinhaContasMensais[] = [];
  meta: Record<number, MetaLinha> = {};

  selecao: LinhaContasMensais[] = [];
  totaisSelecao: TotaisSelecao = { receita: 0, despesa: 0, saldo: 0, count: 0 };

  first = 0;
  rows = 10;
  totalDespesasPagina = 0;

  readonly statusOptions = STATUS_PAGAMENTO_OPTIONS;
  rascunho: Record<number, RascunhoConta> = {};

  private linhaDoMenu: LinhaContasMensais | null = null;
  readonly itensMenuLinha: MenuItem[] = [
    { label: 'Excluir', icon: 'pi pi-trash', command: () => this.linhaDoMenu && this.excluir.emit([this.linhaDoMenu]) }
  ];

  readonly colunasExportacao = [
    { field: 'nome', header: 'Conta' },
    { field: 'categoriaNome', header: 'Categoria' },
    { field: 'parcelaAtual', header: 'Parcela' },
    { field: 'data', header: 'Vencimento' },
    { field: 'valor', header: 'Valor' },
    { field: 'situacao', header: 'Status' },
    { field: 'observacao', header: 'Observação' }
  ];

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['contas'] || changes['hoje']) {
      this.meta = metaDasContas(this.contas, this.hoje);
      this.contasOrdenadas = ordenarPorVencimento(this.contas);
      this.categorias = categoriasDe(this.contas);
      // Seleção de contas que não existem mais (outro mês, excluídas) sai junto.
      const ids = new Set(this.contas.map(c => c.id));
      this.aoSelecionar(this.selecao.filter(c => ids.has(c.id)).map(c => this.contas.find(x => x.id === c.id)!));
    }
    if (changes['edicao'] && !this.edicao && this.filtro === 'alteradas') {
      this.filtro = 'todas';
    }
    if (changes['edicao'] || changes['contas']) {
      this.montarRascunho();
    }
    this.atualizarOpcoesFiltro();
    this.aplicarFiltros();
  }

  // ---------------------------------------------------------------------------
  // Modo edição
  // ---------------------------------------------------------------------------

  private montarRascunho(): void {
    this.rascunho = {};
    if (!this.edicao) return;
    this.contas.forEach(conta => (this.rascunho[conta.id] = this.edicao!.rascunho(conta.id)));
  }

  alterar(conta: LinhaContasMensais, campo: CampoEditavel, valor: unknown): void {
    if (!this.edicao) return;
    this.edicao.alterar(conta.id, campo, valor);
    (this.rascunho[conta.id] as any)[campo] = valor;
    this.atualizarOpcoesFiltro();
  }

  /** Esc no campo. */
  desfazerCampo(conta: LinhaContasMensais, campo: CampoEditavel): void {
    if (!this.edicao) return;
    this.edicao.desfazerCampo(conta.id, campo);
    this.aposDesfazer(conta.id);
  }

  desfazerLinha(conta: LinhaContasMensais): void {
    if (!this.edicao) return;
    this.edicao.desfazerLinha(conta.id);
    this.aposDesfazer(conta.id);
  }

  private aposDesfazer(id: number): void {
    this.rascunho[id] = this.edicao!.rascunho(id);
    this.atualizarOpcoesFiltro();
    this.aplicarFiltros();
  }

  desbloquear(conta: LinhaContasMensais): void {
    this.confirmacao.confirm({
      header: 'Desbloquear conta paga',
      message: `A conta '${conta.nome}' já está paga. Desbloquear para editar?`,
      icon: 'pi pi-lock-open',
      acceptLabel: 'Desbloquear',
      rejectLabel: 'Cancelar',
      rejectButtonStyleClass: 'p-button-text p-button-secondary',
      accept: () => {
        this.edicao?.desbloquear(conta.id);
        this.rascunho[conta.id] = this.edicao!.rascunho(conta.id);
      }
    });
  }

  alterado(id: number, campo?: CampoEditavel): boolean {
    return !!this.edicao?.foiAlterado(id, campo);
  }

  bloqueada(id: number): boolean {
    return !!this.edicao?.bloqueada(id);
  }

  erro(id: number, campo: CampoEditavel): string | undefined {
    return this.edicao?.erros(id)[campo];
  }

  anterior(id: number, campo: CampoEditavel): string {
    return this.edicao?.anterior(id, campo) ?? '';
  }

  previa(conta: LinhaContasMensais): string {
    if (!this.edicao?.foiAlterado(conta.id)) return '';
    return previaDoEfeito(conta, this.edicao.linhaAtual(conta.id), this.hoje);
  }

  /** "Editar" da linha: leva à página da conta e foca o primeiro campo. */
  focarLinha(id: number): void {
    let indice = this.linhasVisiveis.findIndex(c => c.id === id);
    if (indice < 0) {
      this.limparFiltros();
      indice = this.linhasVisiveis.findIndex(c => c.id === id);
      if (indice < 0) return;
    }
    this.first = Math.floor(indice / this.rows) * this.rows;
    this.calcularTotalPagina();

    setTimeout(() => {
      const tr = document.getElementById(`conta-${id}`);
      tr?.scrollIntoView({ block: 'center', behavior: 'smooth' });
      tr?.querySelector<HTMLElement>('input')?.focus();
    });
  }

  private atualizarOpcoesFiltro(): void {
    this.opcoesFiltro = opcoesDeFiltro(this.contas, this.hoje, this.edicao?.contagem);
  }

  aplicarFiltros(): void {
    this.linhasVisiveis = filtrarContas(this.contasOrdenadas, this.meta, {
      filtro: this.filtro,
      busca: this.busca,
      categorias: this.categoriasSelecionadas,
      alteradas: this.edicao?.idsAlterados
    });

    if (this.first >= this.linhasVisiveis.length) this.first = 0;
    this.calcularTotalPagina();
  }

  aoMudarFiltro(): void {
    this.first = 0;
    this.aplicarFiltros();
  }

  limparFiltros(): void {
    this.filtro = 'todas';
    this.busca = '';
    this.categoriasSelecionadas = [];
    this.aoMudarFiltro();
  }

  get temFiltro(): boolean {
    return this.filtro !== 'todas' || !!this.busca.trim() || this.categoriasSelecionadas.length > 0;
  }

  aoPaginar(evento: { first: number; rows: number }): void {
    this.first = evento.first;
    this.rows = evento.rows;
    this.calcularTotalPagina();
  }

  private calcularTotalPagina(): void {
    this.totalDespesasPagina = this.linhasVisiveis
      .slice(this.first, this.first + this.rows)
      .filter(c => naturezaPorSubCategoria(c.subcategoriaNome) === NaturezaLancamento.Despesa)
      .reduce((soma, c) => soma + (parseCurrencyBR(c.valor) ?? 0), 0);
  }

  money(valor: number): string {
    return formatCurrencyBR(valor);
  }

  get totalDespesasPaginaFormatado(): string {
    return formatCurrencyBR(this.totalDespesasPagina);
  }

  aoSelecionar(selecao: LinhaContasMensais[]): void {
    this.selecao = selecao;
    this.totaisSelecao = calcularTotaisSelecao(selecao, c => c.valor, c => naturezaPorSubCategoria(c.subcategoriaNome));
  }

  limparSelecao(): void {
    this.aoSelecionar([]);
  }

  /** Lote: só as que ainda não foram pagas. */
  pagarSelecionadas(): void {
    const abertas = this.selecao.filter(c => this.meta[c.id]?.situacao !== 'paga');
    if (abertas.length) this.marcarPago.emit(abertas);
  }

  get selecaoTemAbertas(): boolean {
    return this.selecao.some(c => this.meta[c.id]?.situacao !== 'paga');
  }

  excluirSelecionadas(): void {
    if (this.selecao.length) this.excluir.emit([...this.selecao]);
  }

  /** GridSelecionavel: o ExclusaoEmLoteService avisa aqui quando termina. */
  concluirExclusao(excluiu: boolean): void {
    if (excluiu) this.limparSelecao();
  }

  abrirMenu(evento: Event, conta: LinhaContasMensais): void {
    this.linhaDoMenu = conta;
    this.menuLinha?.toggle(evento);
  }

  exportar(): void {
    this.dt?.exportCSV();
  }

  /** Exportação legível: data e valor como na tela. */
  readonly formatarExportacao = ({ data, field }: { data: any; field: string }) => {
    if (field === 'data') return formatDateBR(data);
    if (field === 'valor') return formatCurrencyBR(data, { simbolo: false });
    return data ?? '';
  };
}
