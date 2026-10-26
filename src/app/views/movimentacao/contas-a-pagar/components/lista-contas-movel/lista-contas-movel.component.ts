import { Component, EventEmitter, Input, OnChanges, OnDestroy, Output, SimpleChanges, ViewChild } from '@angular/core';
import { NgClass } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MenuItem } from 'primeng/api';
import { BadgeModule } from 'primeng/badge';
import { ButtonModule } from 'primeng/button';
import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';
import { InputTextModule } from 'primeng/inputtext';
import { Menu, MenuModule } from 'primeng/menu';
import { MultiSelectModule } from 'primeng/multiselect';
import { ProgressBarModule } from 'primeng/progressbar';
import { SelectButtonModule } from 'primeng/selectbutton';
import { SidebarModule } from 'primeng/sidebar';
import { TagModule } from 'primeng/tag';

import { LinhaContasMensais } from 'src/app/core/models/conta-mensal.model';
import { GridSelecionavel } from 'src/app/core/services/exclusao-em-lote.service';
import { formatCurrencyBR } from 'src/app/core/utils/mask';
import { CategoryIconComponent } from 'src/app/shared/ui/category-icon/category-icon.component';
import { TotaisSelecao, calcularTotaisSelecao, naturezaPorSubCategoria } from 'src/app/shared/utils/totais-selecao';
import { FiltroSituacao } from '../../contas-a-pagar.regras';
import { AparenciaCategoria } from 'src/app/shared/ui/aparencia';
import {
  MetaLinha, OpcaoFiltro, categoriasDe, filtrarContas, metaDasContas, opcoesDeFiltro, ordenarPorVencimento
} from '../../contas-a-pagar.lista';

/** Quanto o dedo precisa ficar no card para entrar no modo seleção. */
const TOQUE_LONGO_MS = 500;

/**
 * Contas a Pagar no celular: lista de cards no lugar da tabela. Tocar no card abre a edição dele;
 * o toque longo entra no modo seleção (barra azul no topo, ações em lote fixas embaixo).
 * Filtros e o que cada card mostra vêm das mesmas funções da tabela (contas-a-pagar.lista).
 */
@Component({
  selector: 'app-lista-contas-movel',
  standalone: true,
  imports: [
    NgClass, FormsModule, SelectButtonModule, BadgeModule, IconFieldModule, InputIconModule, InputTextModule,
    MultiSelectModule, ButtonModule, ProgressBarModule, TagModule, MenuModule, SidebarModule, CategoryIconComponent
  ],
  templateUrl: './lista-contas-movel.component.html',
  styleUrls: ['./lista-contas-movel.component.scss'],
  // Tags no estilo claro do app, menores e sem quebrar ("ATRASADA" numa linha só).
  host: { class: 'mf-tags-claras tags-compactas' }
})
export class ListaContasMovelComponent implements OnChanges, OnDestroy, GridSelecionavel {
  @ViewChild('menuCard') menuCard?: Menu;

  @Input() contas: LinhaContasMensais[] = [];
  @Input() hoje = new Date();
  /** categoriaId → natureza, ícone e cor (cards #27 e #23). Vazio enquanto a tela carrega as categorias. */
  @Input() aparencias: ReadonlyMap<number, AparenciaCategoria> = new Map();
  @Input() loading = false;

  @Output() marcarPago = new EventEmitter<LinhaContasMensais[]>();
  @Output() excluir = new EventEmitter<LinhaContasMensais[]>();
  @Output() editar = new EventEmitter<LinhaContasMensais>();

  filtro: FiltroSituacao = 'todas';
  busca = '';
  categoriasSelecionadas: string[] = [];
  categorias: string[] = [];
  opcoesFiltro: OpcaoFiltro[] = [];
  filtrosAbertos = false;

  visiveis: LinhaContasMensais[] = [];
  meta: Record<number, MetaLinha> = {};
  private ordenadas: LinhaContasMensais[] = [];

  modoSelecao = false;
  private readonly marcadas = new Set<number>();
  totaisSelecao: TotaisSelecao = { receita: 0, despesa: 0, saldo: 0, count: 0 };

  private timerToque: ReturnType<typeof setTimeout> | null = null;
  /** O click que vem depois de um toque longo não deve marcar de novo nem abrir a edição. */
  private ignorarProximoClique = false;

  private contaDoMenu: LinhaContasMensais | null = null;
  readonly itensMenuCard: MenuItem[] = [
    { label: 'Editar', icon: 'pi pi-pencil', command: () => this.contaDoMenu && this.editar.emit(this.contaDoMenu) },
    { label: 'Excluir', icon: 'pi pi-trash', command: () => this.contaDoMenu && this.excluir.emit([this.contaDoMenu]) }
  ];

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['contas'] || changes['hoje'] || changes['aparencias']) {
      this.meta = metaDasContas(this.contas, this.hoje, this.aparencias);
    }
    if (changes['contas'] || changes['hoje']) {
      this.ordenadas = ordenarPorVencimento(this.contas);
      this.categorias = categoriasDe(this.contas);
      this.opcoesFiltro = opcoesDeFiltro(this.contas, this.hoje);
      // Seleção de contas que não existem mais (outro mês, excluídas) sai junto.
      const ids = new Set(this.contas.map(c => c.id));
      [...this.marcadas].filter(id => !ids.has(id)).forEach(id => this.marcadas.delete(id));
      this.aposMudarSelecao();
    }
    this.aplicarFiltros();
  }

  ngOnDestroy(): void {
    this.cancelarToque();
  }

  // ---------------------------------------------------------------------------
  // Filtros
  // ---------------------------------------------------------------------------

  aplicarFiltros(): void {
    this.visiveis = filtrarContas(this.ordenadas, this.meta, {
      filtro: this.filtro,
      busca: this.busca,
      categorias: this.categoriasSelecionadas
    });
  }

  limparFiltros(): void {
    this.filtro = 'todas';
    this.busca = '';
    this.categoriasSelecionadas = [];
    this.aplicarFiltros();
  }

  // ---------------------------------------------------------------------------
  // Toque no card
  // ---------------------------------------------------------------------------

  iniciarToque(conta: LinhaContasMensais): void {
    this.cancelarToque();
    this.timerToque = setTimeout(() => {
      this.timerToque = null;
      this.ignorarProximoClique = true;
      this.modoSelecao = true;
      this.marcadas.add(conta.id);
      this.aposMudarSelecao();
    }, TOQUE_LONGO_MS);
  }

  cancelarToque(): void {
    if (this.timerToque) clearTimeout(this.timerToque);
    this.timerToque = null;
  }

  tocar(conta: LinhaContasMensais): void {
    if (this.ignorarProximoClique) {
      this.ignorarProximoClique = false;
      return;
    }
    if (!this.modoSelecao) {
      this.editar.emit(conta);
      return;
    }

    if (this.marcadas.has(conta.id)) {
      this.marcadas.delete(conta.id);
    } else {
      this.marcadas.add(conta.id);
    }
    if (!this.marcadas.size) this.modoSelecao = false;
    this.aposMudarSelecao();
  }

  marcada(id: number): boolean {
    return this.marcadas.has(id);
  }

  abrirMenu(evento: Event, conta: LinhaContasMensais): void {
    this.contaDoMenu = conta;
    this.menuCard?.toggle(evento);
  }

  // ---------------------------------------------------------------------------
  // Seleção e lote
  // ---------------------------------------------------------------------------

  selecionadas(): LinhaContasMensais[] {
    return this.contas.filter(c => this.marcadas.has(c.id));
  }

  selecionarTodas(): void {
    this.visiveis.forEach(c => this.marcadas.add(c.id));
    this.aposMudarSelecao();
  }

  limparSelecao(): void {
    this.marcadas.clear();
    this.modoSelecao = false;
    this.aposMudarSelecao();
  }

  get selecaoTemAbertas(): boolean {
    return this.selecionadas().some(c => this.meta[c.id]?.situacao !== 'paga');
  }

  pagarSelecionadas(): void {
    const abertas = this.selecionadas().filter(c => this.meta[c.id]?.situacao !== 'paga');
    if (abertas.length) this.marcarPago.emit(abertas);
  }

  excluirSelecionadas(): void {
    const selecionadas = this.selecionadas();
    if (selecionadas.length) this.excluir.emit(selecionadas);
  }

  /** GridSelecionavel: o ExclusaoEmLoteService avisa aqui quando termina. */
  concluirExclusao(excluiu: boolean): void {
    if (excluiu) this.limparSelecao();
  }

  private aposMudarSelecao(): void {
    this.totaisSelecao = calcularTotaisSelecao(this.selecionadas(), c => c.valor, c => naturezaPorSubCategoria(c.subcategoriaNome));
  }

  money(valor: number): string {
    return formatCurrencyBR(valor);
  }
}
