import { NgStyle } from '@angular/common';
import { Component, EventEmitter, OnInit, Output, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MenuItem, PrimeTemplate } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { DropdownModule } from 'primeng/dropdown';
import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';
import { InputTextModule } from 'primeng/inputtext';
import { Menu, MenuModule } from 'primeng/menu';
import { SelectButtonModule } from 'primeng/selectbutton';
import { SidebarModule } from 'primeng/sidebar';
import { TableModule } from 'primeng/table';
import { TooltipModule } from 'primeng/tooltip';
import { CoberturaCelulaDto, CoberturaImportacoesDto, ImportacaoDto, VinculosImportacaoDto } from 'src/app/core/models/extrato.model';
import { ExtratoBancarioService } from 'src/app/core/services/extrato-bancario.service';
import { LarguraTelaService } from 'src/app/core/services/largura-tela.service';
import { extrairMensagemErro } from 'src/app/core/utils/http-error';
import { formatCurrencyBR } from 'src/app/core/utils/mask';
import { AlertService } from 'src/app/shared/components/alert.service';
import {
  agruparPorMes, corDoBanco, dataCurta, dataHora, filtrarImportacoes, mesColuna, mesCurto, siglaDoBanco, tempoRelativo
} from './importacoes.regras';

const MESES_COBERTURA = 12;

/** Histórico, cobertura por mês e desfazer das importações (card #75). */
@Component({
  selector: 'app-modal-importacoes-mensais',
  standalone: true,
  imports: [
    NgStyle, FormsModule, PrimeTemplate, ButtonModule, DialogModule, DropdownModule, IconFieldModule, InputIconModule, InputTextModule,
    MenuModule, SelectButtonModule, SidebarModule, TableModule, TooltipModule
  ],
  templateUrl: './modal-importacoes-mensais.component.html',
  styleUrl: './modal-importacoes-mensais.component.scss'
})
export class ModalImportacoesMensaisComponent implements OnInit {
  /** true = algo mudou (a tela recarrega). */
  @Output() closed = new EventEmitter<boolean>();
  /** Abrir o Importar; o id preenche a conta. */
  @Output() importar = new EventEmitter<number | null>();
  @Output() verLancamentos = new EventEmitter<ImportacaoDto>();

  private readonly servico = inject(ExtratoBancarioService);
  private readonly alertService = inject(AlertService);
  readonly movel = inject(LarguraTelaService).movel;

  readonly opcoesAba = [{ label: 'Histórico', value: 0 }, { label: 'Cobertura', value: 1 }];
  readonly opcoesPeriodo = [
    { label: 'Últimos 3 meses', value: 3 }, { label: 'Últimos 6 meses', value: 6 },
    { label: 'Últimos 12 meses', value: 12 }, { label: 'Todo o período', value: 0 }
  ];

  aba = 0;
  carregando = true;
  importacoes: ImportacaoDto[] = [];
  busca = '';
  bancoId: number | null = null;
  periodo = 3;
  cobertura: CoberturaImportacoesDto | null = null;
  /** Meses que a janela da cobertura recuou a partir do mais recente. */
  recuo = 0;

  detalhe: ImportacaoDto | null = null;
  itensMenu: MenuItem[] = [];
  desfazendo: ImportacaoDto | null = null;
  vinculos: VinculosImportacaoDto | null = null;
  motivo = '';
  gravando = false;
  private alterou = false;

  readonly sigla = siglaDoBanco;
  readonly dataHora = dataHora;
  readonly dataCurta = dataCurta;
  readonly tempoRelativo = tempoRelativo;
  readonly mesCurto = mesCurto;
  readonly mesColuna = mesColuna;

  ngOnInit(): void {
    this.carregarHistorico();
    this.carregarCobertura();
  }

  get opcoesBanco(): { label: string; value: number | null }[] {
    const bancos = new Map(this.importacoes.map(i => [i.bancoId, i.bancoNome]));
    return [{ label: 'Todos os bancos', value: null }, ...[...bancos].map(([value, label]) => ({ label, value }))];
  }

  get filtradas(): ImportacaoDto[] {
    return filtrarImportacoes(this.importacoes, this.busca, this.bancoId);
  }

  get grupos(): { mes: string; itens: ImportacaoDto[] }[] {
    return agruparPorMes(this.filtradas);
  }

  get totalLancamentos(): number {
    return this.filtradas.reduce((soma, i) => soma + i.lancamentos, 0);
  }

  get textoPeriodo(): string {
    return this.periodo ? `nos últimos ${this.periodo} meses` : 'registrada';
  }

  /** Desktop mostra 6 meses; celular, 4 com ‹ ›. */
  private get tamanhoJanela(): number {
    return this.movel() ? 4 : 6;
  }

  private get indicesJanela(): number[] {
    const total = this.cobertura?.meses.length ?? 0;
    const fim = total - this.recuo;
    return Array.from({ length: this.tamanhoJanela }, (_, n) => fim - this.tamanhoJanela + n).filter(n => n >= 0);
  }

  get mesesVisiveis(): string[] {
    return this.indicesJanela.map(n => this.cobertura!.meses[n]);
  }

  celulasVisiveis(celulas: CoberturaCelulaDto[]): CoberturaCelulaDto[] {
    return this.indicesJanela.map(n => celulas[n]);
  }

  get colunasCobertura(): string {
    return `minmax(5.5rem, 1.4fr) repeat(${this.mesesVisiveis.length}, minmax(0, 1fr))`;
  }

  get podeRecuar(): boolean {
    return !!this.cobertura && this.cobertura.meses.length - this.recuo > this.tamanhoJanela;
  }

  get faltando(): number {
    return (this.cobertura?.contas ?? []).reduce((soma, c) => soma + this.celulasVisiveis(c.celulas).filter(x => x.estado === 'falta').length, 0);
  }

  /** Explica a célula da cobertura: no celular aparece ao tocar. */
  dicaDaCelula(banco: string, x: CoberturaCelulaDto): string {
    const inicio = `${banco} · ${mesCurto(x.mes)}: `;
    const lancamentos = `${x.lancamentos} ${x.lancamentos === 1 ? 'lançamento' : 'lançamentos'}`;
    switch (x.estado) {
      case 'falta': return `${inicio}extrato ainda não importado. ${this.movel() ? 'Toque' : 'Clique'} para importar.`;
      case 'pendencias': return `${inicio}${lancamentos}, ${x.pendencias} sem categoria.`;
      case 'importado': return `${inicio}${lancamentos} importados, todos com categoria.`;
      default: return `${inicio}sem importação esperada neste mês.`;
    }
  }

  moverJanela(delta: number): void {
    this.recuo = Math.max(0, this.recuo + delta);
  }

  moeda(v: number): string {
    return formatCurrencyBR(v);
  }

  estiloBanco(bancoId: number): Record<string, string> {
    const cor = corDoBanco(bancoId);
    return { background: `var(--mf-cor-${cor}-bg)`, color: `var(--mf-cor-${cor}-fg)` };
  }

  carregarHistorico(): void {
    this.carregando = true;
    this.servico.listarImportacoes(this.periodo || null).subscribe({
      next: lista => {
        this.importacoes = lista;
        this.carregando = false;
      },
      error: e => {
        this.carregando = false;
        this.alertService.error(extrairMensagemErro(e, 'Erro ao carregar as importações.'));
      }
    });
  }

  private carregarCobertura(): void {
    this.servico.coberturaImportacoes(MESES_COBERTURA).subscribe({
      next: c => (this.cobertura = c),
      error: e => this.alertService.error(extrairMensagemErro(e, 'Erro ao carregar a cobertura por mês.'))
    });
  }

  abrirMenu(evento: Event, menu: Menu, i: ImportacaoDto): void {
    this.itensMenu = [
      { label: `Ver lançamentos (${i.lancamentos})`, icon: 'pi pi-list', command: () => this.ver(i) },
      { separator: true },
      { label: 'Desfazer importação…', icon: 'pi pi-undo', styleClass: 'imp-menu-perigo', command: () => this.abrirDesfazer(i) }
    ];
    menu.toggle(evento);
  }

  ver(i: ImportacaoDto): void {
    this.detalhe = null;
    this.verLancamentos.emit(i);
  }

  abrirDesfazer(i: ImportacaoDto): void {
    this.detalhe = null;
    this.desfazendo = i;
    this.vinculos = null;
    this.motivo = '';
    this.servico.vinculosImportacao(i.id).subscribe({
      next: v => (this.vinculos = v),
      error: e => {
        this.desfazendo = null;
        this.alertService.error(extrairMensagemErro(e, 'Erro ao conferir a importação.'));
      }
    });
  }

  confirmarDesfazer(): void {
    const alvo = this.desfazendo;
    if (!alvo || this.gravando) return;
    this.gravando = true;
    this.servico.desfazerImportacao(alvo.id, this.motivo).subscribe({
      next: () => {
        this.gravando = false;
        this.desfazendo = null;
        this.alterou = true;
        this.alertService.success('Importação desfeita.');
        this.carregarHistorico();
        this.carregarCobertura();
      },
      error: e => {
        this.gravando = false;
        this.alertService.error(extrairMensagemErro(e, 'Erro ao desfazer a importação.'));
      }
    });
  }

  fechar(): void {
    this.closed.emit(this.alterou);
  }
}
