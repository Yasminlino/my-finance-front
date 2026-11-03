import { NgTemplateOutlet } from '@angular/common';
import { Component, EventEmitter, HostBinding, Input, OnChanges, Output, SimpleChanges, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { CheckboxModule } from 'primeng/checkbox';
import { InputSwitchModule } from 'primeng/inputswitch';
import { SkeletonModule } from 'primeng/skeleton';
import { finalize } from 'rxjs';
import { ListaDto, OcorrenciaDto } from 'src/app/core/models/lista.model';
import { ItemListaService } from 'src/app/core/services/item-lista.service';
import { LarguraTelaService } from 'src/app/core/services/largura-tela.service';
import { extrairMensagemErro } from 'src/app/core/utils/http-error';
import { AlertService } from 'src/app/shared/components/alert.service';
import {
  agruparPorDia, atrasada, dataDe, diaRelativo, diasDaSemana, diasDoMes, doMes, inicioDaSemana, isoDe, periodoPtBr, rotuloDoDia,
  somarDias, tituloDoDia, tituloDoMes
} from '../../agenda.regras';
import { AgendaAdicionarComponent, PreviaDoItem } from '../agenda-adicionar/agenda-adicionar.component';
import { AgendaMiniMesComponent } from '../agenda-mini-mes/agenda-mini-mes.component';
import { AgendaPainelComponent } from '../agenda-painel/agenda-painel.component';

/** Ocorrência clicada: a tela abre o formulário do item com a data original. */
export interface OcorrenciaEscolhida {
  itemId: number;
  dataOriginal: string;
  repete: boolean;
}

export type ModoAgenda = 'DIA' | 'SEMANA' | 'MES';

/** Arrastou uma ocorrência para outro dia (desktop): a tela grava (item que repete: só esta). */
export interface OcorrenciaMovida {
  ocorrencia: OcorrenciaDto;
  para: string;
}

/** No Mês do desktop, quantos itens aparecem no dia antes do "+N mais". */
const ITENS_NO_DIA_DO_MES = 3;

/** Arrastar na faixa do celular: a partir daqui troca a semana. */
const ARRASTO_MINIMO = 50;

/**
 * Agenda do planejamento (card #69): visões Dia e Semana, com as repetições já expandidas pela API
 * (GET itens?de=&ate=). Feito vale por ocorrência para quem repete. Layout dos mockups do card (parte 1b):
 * desktop em colunas; celular com a faixa dos dias, só os dias com pendentes e os feitos recolhidos.
 */
@Component({
  selector: 'app-agenda-semana',
  standalone: true,
  imports: [NgTemplateOutlet, FormsModule, ButtonModule, CheckboxModule, InputSwitchModule, SkeletonModule, AgendaAdicionarComponent, AgendaMiniMesComponent,
    AgendaPainelComponent],
  templateUrl: './agenda-semana.component.html',
  styleUrls: ['./agenda-semana.component.scss']
})
export class AgendaSemanaComponent implements OnChanges {
  @Input({ required: true }) lista!: ListaDto;
  @Input() modo: ModoAgenda = 'SEMANA';
  @Input() somenteLeitura = false;
  /** Cor do planejamento (PaletaCores): borda dos itens e destaque de hoje. */
  @Input() cor = 'roxo';
  /** Regra curta por item ("seg, qua e sex", "não repete"), embaixo da descrição. */
  @Input() regras: Record<number, string> = {};
  /** "+ adicionar" de um dia. */
  @Output() adicionar = new EventEmitter<string>();
  @Output() abrir = new EventEmitter<OcorrenciaEscolhida>();
  /** Marcou ou desmarcou: a tela atualiza o resumo. */
  @Output() mudou = new EventEmitter<void>();
  /** Clicou num dia da semana para vê-lo sozinho (a tela troca a visão e lembra). */
  @Output() modoChange = new EventEmitter<ModoAgenda>();
  @Output() mover = new EventEmitter<OcorrenciaMovida>();

  private readonly itemService = inject(ItemListaService);
  private readonly alertService = inject(AlertService);
  readonly movel = inject(LarguraTelaService).movel;

  /** Dia de referência: a semana dele ou ele mesmo. */
  referencia = new Date();
  dias: string[] = diasDaSemana(inicioDaSemana(this.referencia));
  ocorrencias: OcorrenciaDto[] = [];
  porDia: Record<string, OcorrenciaDto[]> = {};
  /** Celular, Semana: dias com pendentes, em ordem; os feitos vão para o fim, recolhidos. */
  diasComPendentes: string[] = [];
  pendentesPorDia: Record<string, OcorrenciaDto[]> = {};
  feitosDaSemana: OcorrenciaDto[] = [];
  feitosAbertos = false;
  /** Dias com item (pontos do Mês no celular). */
  marcados: ReadonlySet<string> = new Set();
  /** Mês no celular: o dia cujos itens aparecem embaixo do calendário. */
  diaEscolhido = isoDe(new Date());
  escolhidos: string[] = [this.diaEscolhido];
  /** Adicionar rápido: o item tracejado no dia, antes de adicionar. */
  previa: PreviaDoItem | null = null;
  /** Arrastar no desktop. */
  arrastando: OcorrenciaDto | null = null;
  alvo: string | null = null;
  ocultarFeitos = false;
  loading = false;
  hoje = isoDe(new Date());
  /** Referência de "atrasado"; atualizada a cada carga. */
  private agora = new Date();
  private toqueX: number | null = null;

  @HostBinding('style.--agenda-cor') get corDaAgenda() {
    return `var(--mf-cor-${this.cor}-fg, var(--mf-primary))`;
  }

  @HostBinding('style.--agenda-cor-fundo') get fundoDaAgenda() {
    return `var(--mf-cor-${this.cor}-bg, var(--highlight-bg))`;
  }

  get ehDia(): boolean {
    return this.modo === 'DIA';
  }

  get ehMes(): boolean {
    return this.modo === 'MES';
  }

  get periodo(): string {
    if (this.ehMes) {
      const t = tituloDoMes(this.referencia);
      return t.charAt(0).toUpperCase() + t.slice(1);
    }
    return this.ehDia ? tituloDoDia(this.dias[0], this.hoje) : periodoPtBr(this.dias[0], this.dias[6]);
  }

  /** "Hoje" desligado quando já está no período de hoje. */
  get noPeriodoDeHoje(): boolean {
    return this.ehMes ? doMes(this.hoje, this.referencia) : this.dias.includes(this.hoje);
  }

  /** No Mês, só os dias do mês (a grade mostra pedaços dos meses vizinhos). */
  get ocorrenciasDoPeriodo(): OcorrenciaDto[] {
    return this.ehMes ? this.ocorrencias.filter(o => doMes(o.data, this.referencia)) : this.ocorrencias;
  }

  get feitos(): number {
    return this.ocorrenciasDoPeriodo.filter(o => o.feito).length;
  }

  get contagem(): string {
    const onde = this.ehDia ? 'neste dia' : this.ehMes ? 'neste mês' : 'nesta semana';
    const total = this.ocorrenciasDoPeriodo.length;
    return total ? `${this.feitos} de ${total} feitos ${onde}` : `Nada ${onde}`;
  }

  /** O + do celular e o "Novo item" criam aqui: o dia mostrado, o escolhido no Mês, hoje no período de hoje, ou o 1º. */
  get diaParaNovo(): string {
    if (this.ehDia) return this.dias[0];
    if (this.ehMes) return this.diaEscolhido;
    return this.noPeriodoDeHoje ? this.hoje : this.dias[0];
  }

  /** Painel lateral: só no desktop, no Dia e na Semana (no Mês a grade já é o calendário). */
  get mostrarPainel(): boolean {
    return !this.movel() && !this.ehMes;
  }

  get rotuloDoPainel(): string {
    if (this.ehDia) return this.dias[0] === this.hoje ? 'Hoje' : 'Neste dia';
    return this.noPeriodoDeHoje ? 'Esta semana' : 'Nesta semana';
  }

  ngOnChanges(mudancas: SimpleChanges): void {
    if (mudancas['modo']) this.montarDias();
    if (mudancas['lista'] || mudancas['modo']) this.recarregar();
    else if (mudancas['regras']) this.agrupar();
  }

  private montarDias() {
    if (this.ehMes) {
      this.dias = diasDoMes(this.referencia);
      const hoje = isoDe(new Date());
      this.escolherDia(doMes(hoje, this.referencia) ? hoje : isoDe(new Date(this.referencia.getFullYear(), this.referencia.getMonth(), 1)));
      return;
    }
    this.dias = this.ehDia ? [isoDe(this.referencia)] : diasDaSemana(inicioDaSemana(this.referencia));
  }

  private escolherDia(dia: string) {
    this.diaEscolhido = dia;
    this.escolhidos = [dia];
  }

  recarregar() {
    if (!this.lista) return;
    this.loading = true;
    this.itemService.listarPeriodo(this.lista.id, this.dias[0], this.dias[this.dias.length - 1])
      .pipe(finalize(() => (this.loading = false)))
      .subscribe({
        next: ocorrencias => {
          this.agora = new Date();
          this.hoje = isoDe(this.agora);
          this.ocorrencias = ocorrencias;
          this.agrupar();
        },
        error: e => this.alertService.error(extrairMensagemErro(e, 'Erro ao carregar a agenda.'))
      });
  }

  private agrupar() {
    const visiveis = this.ocultarFeitos ? this.ocorrencias.filter(o => !o.feito) : this.ocorrencias;
    this.porDia = agruparPorDia(visiveis, this.dias);
    const pendentes = agruparPorDia(this.ocorrencias.filter(o => !o.feito), this.dias);
    this.pendentesPorDia = pendentes;
    this.diasComPendentes = this.dias.filter(d => pendentes[d].length);
    const feitos = agruparPorDia(this.ocorrencias.filter(o => o.feito), this.dias);
    this.feitosDaSemana = this.ocultarFeitos ? [] : this.dias.flatMap(d => feitos[d]);
    this.marcados = new Set(visiveis.map(o => o.data));
  }

  aoOcultar() {
    this.agrupar();
  }

  irPara(data: Date) {
    this.referencia = data;
    this.montarDias();
    this.recarregar();
  }

  anterior() {
    this.andar(-1);
  }

  proxima() {
    this.andar(1);
  }

  /** Um dia, uma semana ou um mês para trás (-1) ou para a frente (1). */
  private andar(sentido: number) {
    if (this.ehMes) this.irPara(new Date(this.referencia.getFullYear(), this.referencia.getMonth() + sentido, 1));
    else this.irPara(somarDias(this.referencia, sentido * (this.ehDia ? 1 : 7)));
  }

  /** Mini calendário do painel: leva ao dia (no Dia) ou à semana dele (na Semana). */
  irParaDia(dia: string) {
    this.irPara(dataDe(dia));
  }

  /** Mês no celular: escolher um dia mostra os itens dele; dia de outro mês troca o mês. */
  escolherNoMes(dia: string) {
    if (!doMes(dia, this.referencia)) {
      this.irPara(dataDe(dia));
      this.escolherDia(dia);
      return;
    }
    this.escolherDia(dia);
  }

  trocarMes(sentido: number) {
    this.andar(sentido);
  }

  foraDoMes(dia: string): boolean {
    return this.ehMes && !doMes(dia, this.referencia);
  }

  /** Mês no desktop: os primeiros itens do dia; o resto vira "+N mais". */
  primeiros(dia: string): OcorrenciaDto[] {
    return (this.porDia[dia] ?? []).slice(0, ITENS_NO_DIA_DO_MES);
  }

  restantes(dia: string): number {
    return Math.max(0, (this.porDia[dia]?.length ?? 0) - ITENS_NO_DIA_DO_MES);
  }

  /** "Qui 5 · 1 item", embaixo do calendário do celular. */
  get tituloDoEscolhido(): string {
    const n = this.porDia[this.diaEscolhido]?.length ?? 0;
    return `${this.cabecalhoDoGrupo(this.diaEscolhido)} · ${n} ${n === 1 ? 'item' : 'itens'}`;
  }

  // ---- arrastar para outro dia (desktop) ----

  arrastar(evento: DragEvent, o: OcorrenciaDto) {
    if (this.somenteLeitura) return;
    this.arrastando = o;
    evento.dataTransfer?.setData('text/plain', o.descricao);
    if (evento.dataTransfer) evento.dataTransfer.effectAllowed = 'move';
  }

  sobre(evento: DragEvent, dia: string) {
    if (!this.arrastando) return;
    evento.preventDefault();
    if (evento.dataTransfer) evento.dataTransfer.dropEffect = 'move';
    this.alvo = dia;
  }

  sair(dia: string) {
    if (this.alvo === dia) this.alvo = null;
  }

  /** Muda na hora; a tela grava e recarrega (se falhar, a recarga devolve ao lugar). */
  soltar(evento: DragEvent, dia: string) {
    evento.preventDefault();
    const o = this.arrastando;
    this.fimDoArrasto();
    if (!o || o.data === dia) return;
    this.ocorrencias = this.ocorrencias.map(x => (x.itemId === o.itemId && x.dataOriginal === o.dataOriginal ? { ...x, data: dia } : x));
    this.agrupar();
    this.mover.emit({ ocorrencia: o, para: dia });
  }

  fimDoArrasto() {
    this.arrastando = null;
    this.alvo = null;
  }

  irParaHoje() {
    this.irPara(new Date());
  }

  /** Desktop: o cabeçalho do dia abre a visão Dia dele. */
  verDia(dia: string) {
    this.referencia = dataDe(dia);
    this.modoChange.emit('DIA');
  }

  rotulo(dia: string) {
    return rotuloDoDia(dia);
  }

  /** "Hoje · qua 4", "Amanhã · qui 5" ou "sex 6", no grupo do celular. */
  cabecalhoDoGrupo(dia: string): string {
    const { semana, dia: numero } = rotuloDoDia(dia);
    const relativo = diaRelativo(dia, this.hoje);
    return relativo ? `${relativo} · ${semana} ${numero}` : `${semana} ${numero}`;
  }

  temItens(dia: string): boolean {
    return (this.porDia[dia]?.length ?? 0) > 0;
  }

  atrasada(o: OcorrenciaDto): boolean {
    return atrasada(o, this.agora);
  }

  hora(o: OcorrenciaDto): string {
    return o.hora ? o.hora.slice(0, 5) : 'Dia todo';
  }

  regra(o: OcorrenciaDto): string {
    return this.regras[o.itemId] ?? (o.repete ? 'repete' : 'não repete');
  }

  /**
   * Celular: tocar no dia da faixa leva ao grupo dele; dia sem pendentes não tem grupo, então abre a visão Dia
   * (lá aparecem os feitos e o "+ adicionar neste dia").
   */
  tocarDia(dia: string) {
    const grupo = document.getElementById(`agenda-dia-${dia}`);
    if (grupo) grupo.scrollIntoView({ behavior: 'smooth', block: 'start' });
    else this.verDia(dia);
  }

  /** Arrastar a faixa para os lados troca a semana. */
  inicioDoToque(evento: TouchEvent) {
    this.toqueX = evento.changedTouches[0]?.clientX ?? null;
  }

  fimDoToque(evento: TouchEvent) {
    if (this.toqueX === null) return;
    const dx = (evento.changedTouches[0]?.clientX ?? this.toqueX) - this.toqueX;
    this.toqueX = null;
    if (Math.abs(dx) < ARRASTO_MINIMO) return;
    if (dx < 0) this.proxima();
    else this.anterior();
  }

  /** Feito por ocorrência para quem repete; para quem não repete, o item. A tela muda na hora e volta se falhar. */
  alternar(o: OcorrenciaDto) {
    if (this.somenteLeitura) return;
    const feito = !o.feito;
    this.trocar(o, feito);
    const acao$ = o.repete
      ? this.itemService.alterarOcorrencia(this.lista.id, o.itemId, o.dataOriginal, { feito })
      : this.itemService.marcarFeito(this.lista.id, [o.itemId], feito);
    acao$.subscribe({
      next: () => this.mudou.emit(),
      error: e => {
        this.trocar(o, !feito);
        this.alertService.error(extrairMensagemErro(e, 'Não deu para marcar.'));
      }
    });
  }

  private trocar(alvo: OcorrenciaDto, feito: boolean) {
    this.ocorrencias = this.ocorrencias.map(o =>
      o.itemId === alvo.itemId && o.dataOriginal === alvo.dataOriginal ? { ...o, feito } : o);
    this.agrupar();
  }

  escolher(o: OcorrenciaDto) {
    if (this.somenteLeitura) return;
    this.abrir.emit({ itemId: o.itemId, dataOriginal: o.dataOriginal, repete: o.repete });
  }

  /** "26/10" para o leitor de tela. */
  diaMes(dia: string): string {
    const d = dataDe(dia);
    return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;
  }

  /** "ter 27", embaixo da hora nos feitos recolhidos. */
  diaCurto(dia: string): string {
    const { semana, dia: numero } = rotuloDoDia(dia);
    return `${semana} ${numero}`;
  }
}
