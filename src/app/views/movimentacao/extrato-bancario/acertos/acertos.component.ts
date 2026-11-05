import { Component, EventEmitter, Input, OnInit, Output, inject } from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PrimeTemplate } from 'primeng/api';
import { AvatarModule } from 'primeng/avatar';
import { ButtonModule } from 'primeng/button';
import { CalendarModule } from 'primeng/calendar';
import { DropdownModule } from 'primeng/dropdown';
import { InputSwitchModule } from 'primeng/inputswitch';
import { InputTextModule } from 'primeng/inputtext';
import { ProgressBarModule } from 'primeng/progressbar';
import { SelectButtonModule } from 'primeng/selectbutton';
import { SidebarModule } from 'primeng/sidebar';
import { TagModule } from 'primeng/tag';
import { TimelineModule } from 'primeng/timeline';
import { AcertoPessoaDto, AcertosDto } from 'src/app/core/models/acertos.model';
import { ExtratoBancarioItemService } from 'src/app/core/services/extrato-bancario-item.service';
import { extrairMensagemErro } from 'src/app/core/utils/http-error';
import { formatCurrencyBR } from 'src/app/core/utils/mask';
import { AlertService } from 'src/app/shared/components/alert.service';
import { CurrencyInputDirective } from 'src/app/shared/directives/currency-input.directive';
import { EmptyStateComponent } from 'src/app/shared/ui/empty-state/empty-state.component';
import { StatCardComponent } from 'src/app/shared/ui/stat-card/stat-card.component';
import {
  MesDeParcelas, comprasEmAberto, iniciais, pagamentoParaDto, percentualRecebido, pessoasVisiveis, proximasPorMes, restanteDaCompra,
  valorDoPagamento
} from './acertos.regras';

/** O que está sendo preenchido no "Registrar pagamento". */
export type PagamentoEmEdicao = {
  pessoa: AcertoPessoaDto;
  modo: 'tudo' | 'outro';
  /** O "Tudo": o que falta no geral ou o restante da compra escolhida. */
  valor: number;
  outroValor: number | null;
  data: Date;
  bancoId: number | null;
  abateItemId: number | null;
};

/**
 * Aba "Acertos com pessoas" do Extrato (card #45, parte 3): quanto cada pessoa deve, o que já pagou, o que ainda vai
 * cobrar nas próximas faturas, o detalhe e o Registrar pagamento. Carrega sozinha; avisa a tela do que falta receber
 * (o selo da aba) e quando um pagamento entra (para recarregar os lançamentos).
 */
@Component({
  selector: 'app-acertos',
  standalone: true,
  imports: [
    NgTemplateOutlet, FormsModule, PrimeTemplate, AvatarModule, ButtonModule, CalendarModule, DropdownModule, InputSwitchModule, InputTextModule,
    ProgressBarModule, SelectButtonModule, SidebarModule, TagModule, TimelineModule, CurrencyInputDirective, EmptyStateComponent,
    StatCardComponent
  ],
  templateUrl: './acertos.component.html',
  styleUrls: ['./acertos.component.scss']
})
export class AcertosComponent implements OnInit {
  /** Contas e cartões: o filtro e a "conta onde entrou" do pagamento. */
  @Input() bancos: { id: number; nomeBanco: string }[] = [];
  @Input() movel = false;
  /** O total que falta receber (o selo da aba). */
  @Output() faltaReceber = new EventEmitter<number>();
  /** Um pagamento foi gravado: a tela recarrega os lançamentos. */
  @Output() alterou = new EventEmitter<void>();

  private readonly servico = inject(ExtratoBancarioItemService);
  private readonly alertService = inject(AlertService);

  acertos: AcertosDto | null = null;
  loading = false;
  salvando = false;

  /** Intervalo de meses (vazio = desde o início). */
  periodo: Date[] | null = null;
  bancoId: number | null = null;
  mostrarEu = false;
  mostrarQuitados = false;

  /** Pessoa aberta no detalhe. */
  selecionadaId: number | null = null;
  pagamento: PagamentoEmEdicao | null = null;

  readonly opcoesModo = [{ label: 'Tudo', value: 'tudo' }, { label: 'Outro valor', value: 'outro' }];

  ngOnInit(): void {
    this.carregar();
  }

  get opcoesConta(): { label: string; value: number | null }[] {
    return [{ label: 'Todas as contas', value: null }, ...this.bancos.map(b => ({ label: b.nomeBanco, value: b.id }))];
  }

  get contasDoPagamento(): { label: string; value: number }[] {
    return this.bancos.map(b => ({ label: b.nomeBanco, value: b.id }));
  }

  get visiveis(): AcertoPessoaDto[] {
    return pessoasVisiveis(this.acertos, { mostrarQuitados: this.mostrarQuitados, mostrarEu: this.mostrarEu });
  }

  get selecionada(): AcertoPessoaDto | null {
    if (this.selecionadaId == null || !this.acertos) return null;
    return [...this.acertos.pessoas, ...(this.acertos.eu ? [this.acertos.eu] : [])].find(p => p.pessoaId === this.selecionadaId) ?? null;
  }

  get meses(): MesDeParcelas[] {
    return this.selecionada ? proximasPorMes(this.selecionada) : [];
  }

  /** Celular: o detalhe e o pagamento sobem de baixo. */
  get posicaoPainel(): 'right' | 'bottom' {
    return this.movel ? 'bottom' : 'right';
  }

  aoMudarFiltro(): void {
    this.carregar();
  }

  limparPeriodo(): void {
    this.periodo = null;
    this.carregar();
  }

  abrirDetalhe(p: AcertoPessoaDto): void {
    this.selecionadaId = this.selecionadaId === p.pessoaId && !this.movel ? null : p.pessoaId;
  }

  fecharDetalhe(): void {
    this.selecionadaId = null;
  }

  // --- Registrar pagamento ---

  abrirPagamento(p: AcertoPessoaDto, evento?: Event): void {
    evento?.stopPropagation();
    this.pagamento = {
      pessoa: p, modo: 'tudo', valor: valorDoPagamento(p, null), outroValor: null, data: new Date(),
      bancoId: this.bancos.length === 1 ? this.bancos[0].id : null, abateItemId: null
    };
  }

  /** "Abater de": saldo geral (null) ou uma compra em aberto; o "Tudo" acompanha. */
  escolherCompra(compraId: number | null): void {
    if (!this.pagamento) return;
    this.pagamento = { ...this.pagamento, abateItemId: compraId, valor: valorDoPagamento(this.pagamento.pessoa, compraId) };
  }

  opcoesAbater(p: AcertoPessoaDto): { label: string; value: number | null }[] {
    return [
      { label: 'Saldo geral', value: null },
      // Data e parcela distinguem as parcelas da mesma compra (mesma descrição e valor).
      ...comprasEmAberto(p).map(c => ({
        label: [c.descricao || 'Compra', this.parcela(c), this.data(c.data)].filter(Boolean).join(' · ') + ` · falta ${this.moeda(restanteDaCompra(c))}`,
        value: c.id
      }))
    ];
  }

  get valorAPagar(): number {
    if (!this.pagamento) return 0;
    return this.pagamento.modo === 'tudo' ? this.pagamento.valor : Number(this.pagamento.outroValor ?? 0);
  }

  get podeSalvar(): boolean {
    return !!this.pagamento && !!this.pagamento.bancoId && this.valorAPagar > 0 && !this.salvando;
  }

  fecharPagamento(): void {
    if (!this.salvando) this.pagamento = null;
  }

  salvarPagamento(): void {
    const p = this.pagamento;
    if (!p || !this.podeSalvar) return;
    const dto = pagamentoParaDto(p.pessoa, { valor: this.valorAPagar, data: p.data, bancoId: p.bancoId!, abateItemId: p.abateItemId });
    this.salvando = true;
    this.servico.criar(dto).subscribe({
      next: () => {
        this.salvando = false;
        this.pagamento = null;
        this.alertService.success(`Pagamento de ${this.moeda(dto.valor)} registrado.`);
        this.carregar();
        this.alterou.emit();
      },
      error: e => {
        this.salvando = false;
        this.alertService.error(extrairMensagemErro(e, 'Erro ao registrar o pagamento.'));
      }
    });
  }

  // --- tela ---

  moeda(v: number | null | undefined): string {
    return formatCurrencyBR(v ?? 0);
  }

  recebido(p: AcertoPessoaDto): number {
    return percentualRecebido(p);
  }

  avatar(p: AcertoPessoaDto): string {
    return iniciais(p.nome);
  }

  parcela(c: { parcelaAtual: number | null; quantidadeParcelas: number | null }): string {
    return c.quantidadeParcelas && c.quantidadeParcelas > 1 ? `${c.parcelaAtual ?? '?'}/${c.quantidadeParcelas}` : '';
  }

  data(iso: string): string {
    const [a, m, d] = iso.slice(0, 10).split('-');
    return `${d}/${m}/${a}`;
  }

  private carregar(): void {
    this.loading = true;
    const [de, ate] = this.periodo ?? [];
    this.servico.acertos({ inicio: mesDe(de), fim: mesDe(ate ?? de), bancoId: this.bancoId }).subscribe({
      next: a => {
        this.loading = false;
        this.acertos = a;
        this.faltaReceber.emit(a.totais.faltaReceber);
      },
      error: e => {
        this.loading = false;
        this.alertService.error(extrairMensagemErro(e, 'Erro ao carregar os acertos.'));
      }
    });
  }
}

function mesDe(d: Date | null | undefined): string | null {
  return d ? `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}` : null;
}
