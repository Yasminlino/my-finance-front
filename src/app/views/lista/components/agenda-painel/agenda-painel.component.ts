import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges, inject } from '@angular/core';
import { ProgressBarModule } from 'primeng/progressbar';
import { ListaDto, OcorrenciaDto } from 'src/app/core/models/lista.model';
import { ItemListaService } from 'src/app/core/services/item-lista.service';
import { atrasada, dataDe, diaRelativo, diasDoMes, isoDe, proximasPendentes, rotuloDoDia, somarDias } from '../../agenda.regras';
import { AgendaMiniMesComponent } from '../agenda-mini-mes/agenda-mini-mes.component';
import type { OcorrenciaEscolhida } from '../agenda-semana/agenda-semana.component';

/** Próximas: até onde procurar. */
const DIAS_DOS_PROXIMOS = 30;

/**
 * Painel lateral da agenda no desktop (card #69, parte 2, mockup): mini calendário do mês com pontos, progresso do
 * período mostrado, atrasados e as próximas pendentes. Busca sozinho os pontos do mês e as próximas; recarrega quando
 * a tela recarrega o planejamento (o `lista` muda a cada gravação).
 */
@Component({
  selector: 'app-agenda-painel',
  standalone: true,
  imports: [ProgressBarModule, AgendaMiniMesComponent],
  templateUrl: './agenda-painel.component.html',
  styleUrls: ['./agenda-painel.component.scss']
})
export class AgendaPainelComponent implements OnChanges {
  @Input({ required: true }) lista!: ListaDto;
  /** As ocorrências do período mostrado na agenda (progresso e atrasados). */
  @Input() ocorrencias: OcorrenciaDto[] = [];
  /** Os dias do período mostrado (realce no mini calendário). */
  @Input() dias: string[] = [];
  @Input() rotuloDoPeriodo = 'Esta semana';
  @Input() regras: Record<number, string> = {};
  @Output() irPara = new EventEmitter<string>();
  @Output() abrir = new EventEmitter<OcorrenciaEscolhida>();

  private readonly itemService = inject(ItemListaService);

  hoje = isoDe(new Date());
  mes = new Date();
  marcados: ReadonlySet<string> = new Set();
  proximas: OcorrenciaDto[] = [];
  private agora = new Date();

  get feitos(): number {
    return this.ocorrencias.filter(o => o.feito).length;
  }

  get percentual(): number {
    return this.ocorrencias.length ? Math.round((this.feitos / this.ocorrencias.length) * 100) : 0;
  }

  get atrasados(): number {
    return this.ocorrencias.filter(o => atrasada(o, this.agora)).length;
  }

  ngOnChanges(mudancas: SimpleChanges): void {
    this.agora = new Date();
    this.hoje = isoDe(this.agora);
    let pontos = !!mudancas['lista'];
    // O mini calendário acompanha o mês do período quando a agenda anda para outro mês.
    if (mudancas['dias'] && this.dias.length) {
      const meio = dataDe(this.dias[Math.floor(this.dias.length / 2)]);
      if (meio.getMonth() !== this.mes.getMonth() || meio.getFullYear() !== this.mes.getFullYear()) {
        this.mes = meio;
        pontos = true;
      }
    }
    if (pontos) this.carregarPontos();
    if (mudancas['lista']) this.carregarProximas();
  }

  trocarMes(delta: number) {
    this.mes = new Date(this.mes.getFullYear(), this.mes.getMonth() + delta, 1);
    this.carregarPontos();
  }

  private carregarPontos() {
    if (!this.lista) return;
    const grade = diasDoMes(this.mes);
    // Erro aqui só tira os pontos: a agenda já avisa quando a API falha.
    this.itemService.listarPeriodo(this.lista.id, grade[0], grade[grade.length - 1]).subscribe({
      next: ocorrencias => (this.marcados = new Set(ocorrencias.map(o => o.data))),
      error: () => (this.marcados = new Set())
    });
  }

  private carregarProximas() {
    if (!this.lista) return;
    const ate = isoDe(somarDias(this.agora, DIAS_DOS_PROXIMOS));
    this.itemService.listarPeriodo(this.lista.id, this.hoje, ate).subscribe({
      next: ocorrencias => (this.proximas = proximasPendentes(ocorrencias, new Date())),
      error: () => (this.proximas = [])
    });
  }

  selo(o: OcorrenciaDto): { semana: string; dia: string } {
    return rotuloDoDia(o.data);
  }

  /** "18:00 · hoje", "08:00 · toda quinta", "dia todo · amanhã". */
  detalhe(o: OcorrenciaDto): string {
    const hora = o.hora ? o.hora.slice(0, 5) : 'dia todo';
    const relativo = diaRelativo(o.data, this.hoje);
    const extra = relativo ? relativo.toLowerCase() : o.repete ? this.regras[o.itemId] ?? 'repete' : null;
    return extra ? `${hora} · ${extra}` : hora;
  }

  escolherProxima(o: OcorrenciaDto) {
    this.abrir.emit({ itemId: o.itemId, dataOriginal: o.dataOriginal, repete: o.repete });
  }
}
