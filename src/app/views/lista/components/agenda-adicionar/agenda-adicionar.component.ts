import { Component, ElementRef, EventEmitter, Input, OnChanges, Output, SimpleChanges, ViewChild, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { DropdownModule } from 'primeng/dropdown';
import { InputTextModule } from 'primeng/inputtext';
import { finalize } from 'rxjs';
import { ListaDto, RepeticaoItem } from 'src/app/core/models/lista.model';
import { ItemListaService } from 'src/app/core/services/item-lista.service';
import { LarguraTelaService } from 'src/app/core/services/largura-tela.service';
import { extrairMensagemErro } from 'src/app/core/utils/http-error';
import { AlertService } from 'src/app/shared/components/alert.service';
import { dataDe, isoDe, resumoCurto, tituloDoDia } from '../../agenda.regras';
import { TextoInterpretado, interpretarTexto } from '../../agenda-texto';

/** O que vai aparecer tracejado na agenda antes de adicionar. */
export interface PreviaDoItem {
  descricao: string;
  data: string;
  hora: string | null;
}

type Campo = 'data' | 'hora' | 'repeticao';

/**
 * Adicionar rápido da agenda (card #69, parte 2, mockups): "dentista sex 14h30".
 * Desktop: o texto + data, hora e repetir, preenchidos enquanto digita (o campo mexido na mão não é mais sobrescrito).
 * Celular: barra fixa embaixo; o + com texto adiciona, vazio abre o formulário completo.
 */
@Component({
  selector: 'app-agenda-adicionar',
  standalone: true,
  imports: [FormsModule, ButtonModule, DropdownModule, InputTextModule],
  templateUrl: './agenda-adicionar.component.html',
  styleUrls: ['./agenda-adicionar.component.scss']
})
export class AgendaAdicionarComponent implements OnChanges {
  @Input({ required: true }) lista!: ListaDto;
  /** Sem dia no texto, cai aqui (o dia mostrado/escolhido na agenda). */
  @Input() padrao = '';
  @Output() adicionado = new EventEmitter<void>();
  @Output() previa = new EventEmitter<PreviaDoItem | null>();
  /** Celular: o + com o texto vazio pede o formulário completo. */
  @Output() abrirFormulario = new EventEmitter<string>();

  @ViewChild('campoTexto') private campoTexto?: ElementRef<HTMLInputElement>;

  private readonly itemService = inject(ItemListaService);
  private readonly alertService = inject(AlertService);
  readonly movel = inject(LarguraTelaService).movel;

  readonly opcoesRepeticao: { label: string; value: RepeticaoItem }[] = [
    { label: 'Não repete', value: 'NENHUMA' },
    { label: 'Todo dia', value: 'DIARIA' },
    { label: 'Toda semana', value: 'SEMANAL' },
    { label: 'Todo mês', value: 'MENSAL' }
  ];

  texto = '';
  data = '';
  hora = '';
  repeticao: RepeticaoItem = 'NENHUMA';
  diasSemana: number[] = [];
  salvando = false;
  /** Campos que a pessoa mexeu: o texto não sobrescreve mais. */
  private mexidos = new Set<Campo>();
  private lido: TextoInterpretado | null = null;

  get descricao(): string {
    return this.lido?.descricao ?? '';
  }

  get podeAdicionar(): boolean {
    return !!this.descricao && !!this.data && !this.salvando;
  }

  /** Celular: o que foi entendido, embaixo da barra ("Amanhã · qua, 4 nov · 14:30 · toda quarta"). */
  get entendido(): string {
    if (!this.descricao || !this.data) return '';
    const partes = [tituloDoDia(this.data, isoDe(new Date()))];
    if (this.hora) partes.push(this.hora);
    if (this.repeticao !== 'NENHUMA') partes.push(resumoCurto({ repeticao: this.repeticao, diasSemana: this.diasSemana, data: this.data }));
    return partes.join(' · ');
  }

  ngOnChanges(mudancas: SimpleChanges): void {
    // O dia mostrado mudou e a data veio do padrão: acompanha.
    if (mudancas['padrao'] && !this.mexidos.has('data') && !this.lido?.temDia) {
      this.data = this.padrao;
      if (this.texto) this.interpretar();
    }
  }

  aoDigitar() {
    this.interpretar();
  }

  private interpretar() {
    if (!this.texto.trim()) {
      this.lido = null;
      this.limparCampos();
      this.previa.emit(null);
      return;
    }
    const lido = interpretarTexto(this.texto, new Date(), this.padrao || undefined);
    this.lido = lido;
    if (!this.mexidos.has('data')) this.data = lido.data;
    if (!this.mexidos.has('hora')) this.hora = lido.hora ?? '';
    if (!this.mexidos.has('repeticao')) {
      this.repeticao = lido.repeticao;
      this.diasSemana = lido.diasSemana;
    }
    this.avisarPrevia();
  }

  mexeu(campo: Campo) {
    this.mexidos.add(campo);
    if (campo === 'repeticao') this.diasSemana = this.repeticao === 'SEMANAL' && this.data ? [((dataDe(this.data).getDay() + 6) % 7) + 1] : [];
    this.avisarPrevia();
  }

  private avisarPrevia() {
    this.previa.emit(this.descricao && this.data ? { descricao: this.descricao, data: this.data, hora: this.hora || null } : null);
  }

  private limparCampos() {
    this.mexidos.clear();
    this.data = this.padrao;
    this.hora = '';
    this.repeticao = 'NENHUMA';
    this.diasSemana = [];
  }

  /** Enter ou o botão. No celular, o + vazio abre o formulário completo. */
  adicionar() {
    if (!this.descricao) {
      if (this.movel()) this.abrirFormulario.emit(this.data || this.padrao);
      else this.campoTexto?.nativeElement.focus();
      return;
    }
    if (!this.podeAdicionar) return;
    const semanal = this.repeticao === 'SEMANAL';
    const item = {
      id: 0,
      descricao: this.descricao,
      feito: false,
      data: this.data,
      hora: this.hora ? `${this.hora.slice(0, 5)}:00` : null,
      repeticao: this.repeticao,
      diasSemana: semanal ? this.diasSemana : null,
      repetirAte: null,
      quantidade: this.lista.usaQuantidade ? 1 : null
    };
    this.salvando = true;
    this.itemService.criar(this.lista.id, item).pipe(finalize(() => (this.salvando = false))).subscribe({
      next: () => {
        this.texto = '';
        this.lido = null;
        this.limparCampos();
        this.previa.emit(null);
        this.adicionado.emit();
        this.campoTexto?.nativeElement.focus();
      },
      error: e => this.alertService.error(extrairMensagemErro(e, 'Não deu para adicionar.'))
    });
  }
}
