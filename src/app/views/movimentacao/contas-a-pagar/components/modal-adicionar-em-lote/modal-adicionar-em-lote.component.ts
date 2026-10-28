import { Component, EventEmitter, Input, OnInit, Output, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { catchError, concatMap, finalize, forkJoin, from, map, of, toArray } from 'rxjs';
import { BadgeModule } from 'primeng/badge';
import { ButtonModule } from 'primeng/button';
import { CheckboxModule } from 'primeng/checkbox';
import { DialogModule } from 'primeng/dialog';
import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';
import { InputTextModule } from 'primeng/inputtext';
import { MultiSelectModule } from 'primeng/multiselect';
import { SelectButtonModule } from 'primeng/selectbutton';
import { SidebarModule } from 'primeng/sidebar';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { TooltipModule } from 'primeng/tooltip';

import { ContaService } from 'src/app/core/services/contas.service';
import { CategoryService } from 'src/app/core/services/category.service';
import { ContaMensalService } from 'src/app/core/services/conta-mensal.service';
import { LarguraTelaService } from 'src/app/core/services/largura-tela.service';
import { AlertService } from 'src/app/shared/components/alert.service';
import { CurrencyInputDirective } from 'src/app/shared/directives/currency-input.directive';
import { CategoryIconComponent } from 'src/app/shared/ui/category-icon/category-icon.component';
import { EmptyStateComponent } from 'src/app/shared/ui/empty-state/empty-state.component';
import { FilterBarComponent } from 'src/app/shared/ui/filter-bar/filter-bar.component';
import { formatCurrencyBR } from 'src/app/core/utils/mask';
import { extrairMensagemErro } from 'src/app/core/utils/http-error';
import { lerDiasVencimento } from 'src/app/core/utils/dias-vencimento';
import {
  FiltroLote, LinhaLote, TotaisLote, ajustarLinha, contarPorFiltro, filtrarLinhas, montarLinhas, payloadDaLinha,
  totaisDoLote
} from './lote.regras';

/** O que o lote gravou: quantas contas e os ids das transações criadas (uma por vencimento). */
export interface LoteAdicionado {
  contas: number;
  ids: number[];
}

/** Resultado de uma conta gravada: os ids das transações criadas, ou null se falhou. */
type Gravacao = { linha: LinhaLote; ids: number[] | null };

/**
 * "Adicionar contas em lote" (card #48): as contas cadastradas que ainda não entraram no mês, com valor e dia
 * ajustáveis só para este lançamento. Desktop: p-dialog com tabela; celular: tela cheia com cards e o ajuste
 * num painel de baixo. As regras ficam em lote.regras.ts.
 */
@Component({
  selector: 'app-modal-adicionar-em-lote',
  standalone: true,
  imports: [
    CommonModule, FormsModule, BadgeModule, ButtonModule, CheckboxModule, DialogModule, IconFieldModule, InputIconModule,
    InputTextModule, MultiSelectModule, SelectButtonModule, SidebarModule, TableModule, TagModule, TooltipModule,
    CurrencyInputDirective, CategoryIconComponent, EmptyStateComponent, FilterBarComponent
  ],
  templateUrl: './modal-adicionar-em-lote.component.html',
  styleUrls: ['./modal-adicionar-em-lote.component.scss']
})
export class ModalAdicionarEmLoteComponent implements OnInit {
  /** Mês do lote, "YYYY-MM". */
  @Input({ required: true }) month!: string;
  /** true = gravou alguma conta. */
  @Output() closed = new EventEmitter<boolean>();
  /** A tela recarrega, destaca os lançamentos novos e oferece Desfazer. */
  @Output() adicionadas = new EventEmitter<LoteAdicionado>();

  private readonly contaService = inject(ContaService);
  private readonly categoryService = inject(CategoryService);
  private readonly contaMensalService = inject(ContaMensalService);
  private readonly alertService = inject(AlertService);
  readonly movel = inject(LarguraTelaService).movel;

  hoje = new Date();
  titulo = '';
  linhas: LinhaLote[] = [];
  exibidas: LinhaLote[] = [];
  /** Só no filtro Disponíveis: as lançadas e inativas, no grupo recolhível. */
  desabilitadas: LinhaLote[] = [];
  grupoAberto = false;
  /** Ids das contas escolhidas. */
  selecionadas = new Set<number>();
  totais: TotaisLote = { quantidade: 0, receitas: 0, despesas: 0, saldo: 0 };

  filtro: FiltroLote = 'disponiveis';
  busca = '';
  categoriasSelecionadas: number[] = [];
  opcoesCategoria: { label: string; value: number }[] = [];
  /** Campo, não getter: objetos novos a cada detecção fariam o p-selectButton perder o clique (#23). */
  opcoesFiltro: { label: string; value: FiltroLote; contagem: number }[] = [];

  loading = false;
  saving = false;

  /** Celular: conta aberta no painel de ajuste, com os valores ainda não aplicados. */
  emAjuste: LinhaLote | null = null;
  valorEmAjuste: number | null = null;
  diasEmAjuste = '';

  ngOnInit() {
    const [ano, mes] = this.month.split('-').map(Number);
    const nomeMes = new Date(ano, mes - 1, 1).toLocaleDateString('pt-BR', { month: 'long' });
    this.titulo = `Adicionar contas de ${nomeMes}/${ano}`;
    this.carregar();
  }

  /** Inativas vêm junto, desabilitadas. */
  private carregar() {
    this.loading = true;
    forkJoin({
      contas: this.contaService.listar(),
      categorias: this.categoryService.listar().pipe(catchError(() => of([]))),
      doMes: this.contaMensalService.listarDoMes(this.month, false)
    })
      .pipe(finalize(() => (this.loading = false)))
      .subscribe({
        next: ({ contas, categorias, doMes }) => {
          this.hoje = new Date();
          this.linhas = montarLinhas(contas ?? [], doMes ?? [], categorias, this.month, this.hoje);
          this.opcoesCategoria = [...categorias]
            .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'))
            .map(c => ({ label: c.nome, value: c.id }));
          this.aoMudarFiltro();
        },
        error: e => this.alertService.error(extrairMensagemErro(e, 'Erro ao carregar as contas cadastradas.'))
      });
  }

  aoMudarFiltro() {
    const criterio = { busca: this.busca, categorias: this.categoriasSelecionadas };
    const contagem = contarPorFiltro(this.linhas, criterio);
    this.opcoesFiltro = [
      { label: 'Disponíveis', value: 'disponiveis', contagem: contagem.disponiveis },
      { label: 'Já lançadas', value: 'lancadas', contagem: contagem.lancadas },
      { label: 'Todas', value: 'todas', contagem: contagem.todas }
    ];
    this.exibidas = filtrarLinhas(this.linhas, { ...criterio, filtro: this.filtro });
    this.desabilitadas = this.filtro === 'disponiveis'
      ? filtrarLinhas(this.linhas, { ...criterio, filtro: 'todas' }).filter(l => !this.escolhivel(l))
      : [];
    this.atualizarTotais();
  }

  get temFiltro(): boolean {
    return !!this.busca || this.categoriasSelecionadas.length > 0;
  }

  limparFiltros() {
    this.busca = '';
    this.categoriasSelecionadas = [];
    this.aoMudarFiltro();
  }

  /** Lançada e inativa não se escolhem nem se ajustam; inválida se ajusta até ficar disponível. */
  escolhivel(linha: LinhaLote): boolean {
    return linha.situacao === 'disponivel' || linha.situacao === 'invalida';
  }

  /** Conta sem dia no cadastro: a linha pede o dia deste mês. */
  pedeDia(linha: LinhaLote): boolean {
    return !linha.conta.vencimentos?.length;
  }

  get validasExibidas(): LinhaLote[] {
    return this.exibidas.filter(l => l.situacao === 'disponivel');
  }

  get todasValidasSelecionadas(): boolean {
    const validas = this.validasExibidas;
    return validas.length > 0 && validas.every(l => this.selecionadas.has(l.conta.id));
  }

  alternar(linha: LinhaLote) {
    if (linha.situacao !== 'disponivel') return;
    const proximas = new Set(this.selecionadas);
    if (proximas.has(linha.conta.id)) proximas.delete(linha.conta.id);
    else proximas.add(linha.conta.id);
    this.selecionadas = proximas;
    this.atualizarTotais();
  }

  /** Marca todas as válidas exibidas; com todas já marcadas, desmarca. */
  alternarTodasValidas() {
    const ids = this.validasExibidas.map(l => l.conta.id);
    const proximas = new Set(this.selecionadas);
    if (this.todasValidasSelecionadas) ids.forEach(id => proximas.delete(id));
    else ids.forEach(id => proximas.add(id));
    this.selecionadas = proximas;
    this.atualizarTotais();
  }

  informarValor(linha: LinhaLote, valor: number | null) {
    this.ajustar(linha, { valor });
  }

  /** "5, 20" → [5, 20]; texto inválido deixa a linha sem dia. */
  informarDias(linha: LinhaLote, texto: string) {
    this.ajustar(linha, { dias: lerDiasVencimento(texto) ?? [] });
  }

  /**
   * Muda a linha no lugar (a tabela não recria a linha e o campo não perde o foco). Ficou válida: entra na seleção;
   * ficou inválida: sai.
   */
  private ajustar(linha: LinhaLote, ajuste: { valor?: number | null; dias?: number[] }) {
    const antes = linha.situacao;
    Object.assign(linha, ajustarLinha(linha, ajuste, this.month, this.hoje));
    const proximas = new Set(this.selecionadas);
    if (linha.situacao !== 'disponivel') proximas.delete(linha.conta.id);
    else if (antes === 'invalida') proximas.add(linha.conta.id);
    this.selecionadas = proximas;
    this.atualizarTotais();
  }

  private get linhasSelecionadas(): LinhaLote[] {
    return this.linhas.filter(l => this.selecionadas.has(l.conta.id));
  }

  private atualizarTotais() {
    this.totais = totaisDoLote(this.linhasSelecionadas);
  }

  get rotuloAdicionar(): string {
    const n = this.totais.quantidade;
    return n === 0 ? 'Adicionar contas' : `Adicionar ${n} ${n === 1 ? 'conta' : 'contas'}`;
  }

  /** "+ R$ 925,80" / "− R$ 510,00". */
  get saldoTexto(): string {
    const { saldo } = this.totais;
    return `${saldo < 0 ? '−' : '+'} ${formatCurrencyBR(Math.abs(saldo))}`;
  }

  moeda(valor: number): string {
    return formatCurrencyBR(valor);
  }

  // ---------- Celular: painel de ajuste ----------

  abrirAjuste(linha: LinhaLote) {
    if (!this.escolhivel(linha)) return;
    this.emAjuste = linha;
    this.valorEmAjuste = linha.valor;
    this.diasEmAjuste = linha.dias.join(', ');
  }

  /** Toque no card: escolhe a válida; a inválida abre o ajuste. */
  tocarCard(linha: LinhaLote) {
    if (linha.situacao === 'invalida') this.abrirAjuste(linha);
    else this.alternar(linha);
  }

  aplicarAjuste() {
    const linha = this.emAjuste;
    if (!linha) return;
    this.ajustar(linha, {
      valor: this.valorEmAjuste,
      ...(this.pedeDia(linha) ? { dias: lerDiasVencimento(this.diasEmAjuste) ?? [] } : {})
    });
    this.emAjuste = null;
  }

  // ---------- Gravação ----------

  close(salvou = false) {
    this.closed.emit(salvou);
  }

  /** Uma por vez; uma falha não interrompe as demais. As que falharam continuam escolhidas. */
  adicionar() {
    const escolhidas = this.linhasSelecionadas.filter(l => l.situacao === 'disponivel');
    if (!escolhidas.length) return;

    this.saving = true;
    from(escolhidas).pipe(
      concatMap(linha => this.contaMensalService.criar(payloadDaLinha(linha, this.month)).pipe(
        map((criadas): Gravacao => ({ linha, ids: ((criadas as { id: number }[] | null) ?? []).map(t => t.id) })),
        catchError(() => of<Gravacao>({ linha, ids: null }))
      )),
      toArray(),
      finalize(() => (this.saving = false))
    ).subscribe(gravacoes => {
      const ids = gravacoes.flatMap(g => g.ids ?? []);
      const falhas = gravacoes.filter(g => g.ids === null).map(g => g.linha);
      const gravadas = gravacoes.length - falhas.length;
      if (gravadas) this.adicionadas.emit({ contas: gravadas, ids });
      if (!falhas.length) {
        this.close(true);
        return;
      }
      // As que entraram viram "já lançadas" aqui mesmo: recarregar perderia os ajustes das que falharam.
      gravacoes.filter(g => g.ids !== null).forEach(g => Object.assign(g.linha, { situacao: 'lancada', motivo: null }));
      this.selecionadas = new Set(falhas.map(l => l.conta.id));
      this.aoMudarFiltro();
      this.alertService.error(`Não foi possível adicionar: ${falhas.map(l => l.conta.nome).join(', ')}.`);
    });
  }
}
