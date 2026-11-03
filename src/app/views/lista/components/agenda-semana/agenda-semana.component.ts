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
  agruparPorDia, atrasada, dataDe, diaRelativo, diasDaSemana, inicioDaSemana, isoDe, periodoPtBr, rotuloDoDia, somarDias, tituloDoDia
} from '../../agenda.regras';

/** Ocorrência clicada: a tela abre o formulário do item com a data original. */
export interface OcorrenciaEscolhida {
  itemId: number;
  dataOriginal: string;
  repete: boolean;
}

export type ModoAgenda = 'DIA' | 'SEMANA';

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
  imports: [NgTemplateOutlet, FormsModule, ButtonModule, CheckboxModule, InputSwitchModule, SkeletonModule],
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

  get periodo(): string {
    return this.ehDia ? tituloDoDia(this.dias[0], this.hoje) : periodoPtBr(this.dias[0], this.dias[6]);
  }

  /** "Hoje" desligado quando já está no período de hoje. */
  get noPeriodoDeHoje(): boolean {
    return this.dias.includes(this.hoje);
  }

  get feitos(): number {
    return this.ocorrencias.filter(o => o.feito).length;
  }

  get contagem(): string {
    const onde = this.ehDia ? 'neste dia' : 'nesta semana';
    return this.ocorrencias.length ? `${this.feitos} de ${this.ocorrencias.length} feitos ${onde}` : `Nada ${onde}`;
  }

  /** O + do celular e o "Novo item" criam aqui: o dia mostrado, hoje na semana de hoje, ou a segunda. */
  get diaParaNovo(): string {
    if (this.ehDia) return this.dias[0];
    return this.noPeriodoDeHoje ? this.hoje : this.dias[0];
  }

  ngOnChanges(mudancas: SimpleChanges): void {
    if (mudancas['modo']) this.montarDias();
    if (mudancas['lista'] || mudancas['modo']) this.recarregar();
    else if (mudancas['regras']) this.agrupar();
  }

  private montarDias() {
    this.dias = this.ehDia ? [isoDe(this.referencia)] : diasDaSemana(inicioDaSemana(this.referencia));
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
    this.irPara(somarDias(this.referencia, this.ehDia ? -1 : -7));
  }

  proxima() {
    this.irPara(somarDias(this.referencia, this.ehDia ? 1 : 7));
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
