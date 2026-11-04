import { Component, DestroyRef, ElementRef, EventEmitter, Input, OnInit, Output, ViewChild, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AbstractControl, FormBuilder, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { DropdownModule } from 'primeng/dropdown';
import { InputNumberModule } from 'primeng/inputnumber';
import { InputSwitchModule } from 'primeng/inputswitch';
import { InputTextModule } from 'primeng/inputtext';
import { InputTextareaModule } from 'primeng/inputtextarea';
import { MessageModule } from 'primeng/message';
import { SelectButtonModule } from 'primeng/selectbutton';
import { Observable, finalize } from 'rxjs';
import { ItemListaDto, ListaDto, RepeticaoItem } from 'src/app/core/models/lista.model';
import { ConfirmacaoService } from 'src/app/core/services/confirmacao.service';
import { ItemListaService } from 'src/app/core/services/item-lista.service';
import { extrairMensagemErro } from 'src/app/core/utils/http-error';
import { formatCurrencyBR } from 'src/app/core/utils/mask';
import { AlertService } from 'src/app/shared/components/alert.service';
import { FieldErrorComponent } from 'src/app/shared/ui/field-error/field-error.component';
import { FormPanelComponent } from 'src/app/shared/ui/form-panel/form-panel.component';
import { dataDe, resumoDaRegra } from '../../agenda.regras';
import { exemploDoItem, totalDoItem } from '../../planejamento.regras';

/** Descrição só com espaços conta como vazia. */
const naoVazio = Validators.pattern(/\S/);

/** Quando o item repete e veio de um dia da agenda, salvar e excluir perguntam o alcance. */
type Alcance = 'salvar' | 'excluir';

/**
 * Novo/editar item do planejamento (card #66), no lugar dos dois modais das telas antigas: mostra só os campos
 * ligados. O que fica escondido (campo desligado, ordem) é gravado como estava. Com Data, a repetição (card #69).
 */
@Component({
  selector: 'app-item-planejamento-form',
  standalone: true,
  imports: [
    ReactiveFormsModule, ButtonModule, DropdownModule, InputNumberModule, InputSwitchModule, InputTextModule, InputTextareaModule, MessageModule,
    SelectButtonModule, FieldErrorComponent, FormPanelComponent
  ],
  templateUrl: './item-planejamento-form.component.html',
  styleUrls: ['./item-planejamento-form.component.scss']
})
export class ItemPlanejamentoFormComponent implements OnInit {
  @Input({ required: true }) lista!: ListaDto;
  /** Em edição; null = novo. */
  @Input() item: ItemListaDto | null = null;
  /** Aberto de um dia da agenda: a ocorrência (AAAA-MM-DD original) e, no novo, a data já preenchida. */
  @Input() dataOriginal: string | null = null;
  @Input() dataInicial: string | null = null;
  /** Tipos já usados no planejamento: sugestões do campo Tipo (card #61). */
  @Input() tipos: string[] = [];
  /** true = gravou ou excluiu (a tela recarrega). */
  @Output() closed = new EventEmitter<boolean>();
  /** "Salvar e outro": gravou e o painel continua aberto (a tela recarrega por trás). */
  @Output() salvo = new EventEmitter<void>();

  @ViewChild('campoDescricao') private campoDescricao?: ElementRef<HTMLInputElement>;

  private readonly fb = inject(FormBuilder);
  private readonly itemService = inject(ItemListaService);
  private readonly confirmacao = inject(ConfirmacaoService);
  private readonly alertService = inject(AlertService);
  private readonly destroyRef = inject(DestroyRef);

  saving = false;
  /** Pergunta "só esta / esta e as próximas" aberta. */
  escolhendo: Alcance | null = null;

  readonly opcoesRepeticao: { label: string; value: RepeticaoItem }[] = [
    { label: 'Não repete', value: 'NENHUMA' },
    { label: 'Todo dia', value: 'DIARIA' },
    { label: 'Toda semana', value: 'SEMANAL' },
    { label: 'Todo mês', value: 'MENSAL' }
  ];
  /** label = nome inteiro (leitor de tela e dica); letra = o que aparece no botão redondo. */
  readonly opcoesDias = [
    { label: 'Segunda', letra: 'S', value: 1 }, { label: 'Terça', letra: 'T', value: 2 }, { label: 'Quarta', letra: 'Q', value: 3 },
    { label: 'Quinta', letra: 'Q', value: 4 }, { label: 'Sexta', letra: 'S', value: 5 }, { label: 'Sábado', letra: 'S', value: 6 },
    { label: 'Domingo', letra: 'D', value: 7 }
  ];

  readonly form = this.fb.group({
    descricao: this.fb.nonNullable.control('', [Validators.required, naoVazio, Validators.maxLength(200)]),
    quantidade: this.fb.control<number | null>(1, [Validators.min(1)]),
    valor: this.fb.control<number | null>(null, [Validators.min(0)]),
    data: this.fb.control<string | null>(null),
    hora: this.fb.control<string | null>({ value: null, disabled: true }),
    /** Só da tela: ligado = sem hora. Desligado exige a hora. */
    diaTodo: this.fb.nonNullable.control(true),
    repeticao: this.fb.nonNullable.control<RepeticaoItem>('NENHUMA'),
    diasSemana: this.fb.control<number[]>([]),
    repetirAte: this.fb.control<string | null>(null),
    observacao: this.fb.control<string | null>(null, [Validators.maxLength(500)]),
    tipo: this.fb.control<string | null>(null, [Validators.maxLength(60)]),
    feito: this.fb.nonNullable.control(false)
  }, { validators: g => this.regraValida(g) });

  get titulo(): string {
    return this.item ? 'Editar item' : 'Novo item';
  }

  /** O item gravado repete (a pergunta de alcance só vale para ele). */
  get repete(): boolean {
    return !!this.item?.repeticao && this.item.repeticao !== 'NENHUMA';
  }

  /** Veio de um dia da agenda e o item repete: salvar e excluir perguntam o alcance. */
  get perguntaAlcance(): boolean {
    return this.repete && !!this.dataOriginal;
  }

  get repeticao(): RepeticaoItem {
    return this.form.controls.repeticao.value;
  }

  /** "Seg, qua e sex às 07:00 · sem data de fim" ou "…, até 30/11/2026". */
  get resumoRegra(): string {
    const v = this.form.getRawValue();
    const resumo = resumoDaRegra({ repeticao: v.repeticao, diasSemana: v.diasSemana, hora: v.hora, repetirAte: v.repetirAte, data: v.data });
    return resumo && !v.repetirAte ? `${resumo} · sem data de fim` : resumo;
  }

  get exemplo(): string {
    return exemploDoItem(this.lista);
  }

  get exemploObservacao(): string {
    return this.lista.usaData ? 'Ex.: levar toalha' : 'Ex.: a marca de sempre';
  }

  /** Total do item como a tela soma (null sem valor). */
  get total(): number | null {
    const { quantidade, valor } = this.form.getRawValue();
    return totalDoItem({ quantidade, valor }, this.lista);
  }

  get rotuloValor(): string {
    return this.lista.modoValor === 'UNITARIO' ? 'Valor unitário' : 'Valor do item';
  }

  ngOnInit(): void {
    if (this.lista.usaQuantidade) this.form.controls.quantidade.addValidators(Validators.required);
    if (this.item) {
      const i = this.item;
      this.form.patchValue({
        descricao: i.descricao ?? '', quantidade: i.quantidade ?? 1, valor: i.valor ?? null,
        // Aberto de um dia da agenda: a data mostrada é a da ocorrência.
        data: this.dataOriginal ?? i.data ?? null,
        hora: i.hora ? i.hora.slice(0, 5) : null, diaTodo: !i.hora, repeticao: i.repeticao ?? 'NENHUMA', diasSemana: i.diasSemana ?? [],
        repetirAte: i.repetirAte ?? null, observacao: i.observacao ?? null, tipo: i.tipo ?? null, feito: !!i.feito
      });
    } else if (this.dataInicial) {
      this.form.patchValue({ data: this.dataInicial });
    }
    this.aplicarDiaTodo(this.form.controls.diaTodo.value);
    this.form.controls.diaTodo.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(d => this.aplicarDiaTodo(d, true));
    // Toda semana sem dia escolhido: começa pelo dia da data.
    this.form.controls.repeticao.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(r => {
      const data = this.form.controls.data.value;
      if (r === 'SEMANAL' && !this.form.controls.diasSemana.value?.length && data)
        this.form.controls.diasSemana.setValue([((dataDe(data).getDay() + 6) % 7) + 1]);
    });
  }

  /** Dia todo: sem hora (campo desligado). Ao desligar pelo switch, o foco vai para a hora. */
  private aplicarDiaTodo(diaTodo: boolean, peloSwitch = false) {
    const hora = this.form.controls.hora;
    if (diaTodo) {
      hora.setValue(null, { emitEvent: false });
      hora.disable({ emitEvent: false });
    } else {
      hora.enable({ emitEvent: false });
      if (peloSwitch) setTimeout(() => (document.getElementById('item-hora') as HTMLInputElement | null)?.focus());
    }
    this.form.updateValueAndValidity({ emitEvent: false });
  }

  /**
   * Com Data: "Dia todo" desligado exige a hora. Repetir exige data; toda semana exige ao menos um dia; "até" não pode
   * ser antes da data.
   */
  private regraValida(g: AbstractControl): ValidationErrors | null {
    const grupo = g as AbstractControl & { getRawValue?: () => unknown };
    const v = (grupo.getRawValue ? grupo.getRawValue() : g.value) as {
      repeticao: RepeticaoItem; data: string | null; diasSemana: number[] | null; repetirAte: string | null; diaTodo: boolean;
      hora: string | null;
    } | null;
    if (!v) return null;
    if (this.lista?.usaData && !v.diaTodo && !v.hora) return { semHora: true };
    if (v.repeticao === 'NENHUMA') return null;
    if (!v.data) return { repeticaoSemData: true };
    if (v.repeticao === 'SEMANAL' && !v.diasSemana?.length) return { semanaSemDias: true };
    if (v.repetirAte && v.repetirAte < v.data) return { ateAntesDaData: true };
    return null;
  }

  erroRegra(codigo: string): boolean {
    return !!this.form.errors?.[codigo] && (this.form.touched || this.form.dirty);
  }

  moeda(valor: number): string {
    return formatCurrencyBR(valor);
  }

  close() {
    this.closed.emit(false);
  }

  /** Com data e hora já com segundos; campos desligados ficam como estavam (no novo, vazios). */
  private montarPayload(): Partial<ItemListaDto> & { id: number } {
    const v = this.form.getRawValue();
    const l = this.lista;
    const antes = this.item;
    const repeticao = l.usaData ? v.repeticao : antes?.repeticao ?? 'NENHUMA';
    return {
      ...antes,
      id: antes?.id ?? 0,
      descricao: v.descricao.trim(),
      feito: v.feito,
      quantidade: l.usaQuantidade ? v.quantidade : antes?.quantidade ?? null,
      valor: l.usaValor ? v.valor : antes?.valor ?? null,
      data: l.usaData ? v.data || null : antes?.data ?? null,
      hora: l.usaData ? (!v.diaTodo && v.hora ? `${v.hora.slice(0, 5)}:00` : null) : antes?.hora ?? null,
      repeticao,
      diasSemana: l.usaData ? (repeticao === 'SEMANAL' ? [...(v.diasSemana ?? [])].sort((a, b) => a - b) : null) : antes?.diasSemana ?? null,
      repetirAte: l.usaData ? (repeticao === 'NENHUMA' ? null : v.repetirAte || null) : antes?.repetirAte ?? null,
      observacao: l.usaObservacao ? v.observacao?.trim() || null : antes?.observacao ?? null,
      tipo: l.usaTipo ? v.tipo?.trim() || null : antes?.tipo ?? null
    };
  }

  save() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    if (this.perguntaAlcance) {
      this.escolhendo = 'salvar';
      return;
    }
    const payload = this.montarPayload();
    this.gravar(this.item ? this.itemService.atualizar(this.lista.id, payload) : this.itemService.criar(this.lista.id, payload),
      'Erro ao salvar o item.');
  }

  /** Novo item: grava, limpa (fica a data, para lançar vários no mesmo dia) e continua aberto. */
  salvarEOutro() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.saving = true;
    this.itemService.criar(this.lista.id, this.montarPayload()).pipe(finalize(() => (this.saving = false))).subscribe({
      next: () => {
        // Foco antes de limpar: o p-inputNumber relê o texto mostrado ao perder o foco (card #66).
        this.campoDescricao?.nativeElement.focus();
        const data = this.form.controls.data.value;
        this.form.reset({
          descricao: '', quantidade: 1, valor: null, data, hora: null, diaTodo: true, repeticao: 'NENHUMA',
          diasSemana: [], repetirAte: null, observacao: null, tipo: null, feito: false
        });
        this.aplicarDiaTodo(true);
        this.alertService.success('Item adicionado.');
        this.salvo.emit();
      },
      error: e => this.alertService.error(extrairMensagemErro(e, 'Erro ao salvar o item.'))
    });
  }

  async excluir() {
    if (!this.item) return;
    if (this.perguntaAlcance) {
      this.escolhendo = 'excluir';
      return;
    }
    const ok = await this.confirmacao.confirmar(`Excluir o item "${this.item.descricao}"?`, { titulo: 'Excluir item' });
    if (!ok) return;
    this.gravar(this.itemService.excluir(this.lista.id, this.item.id), 'Erro ao excluir o item.');
  }

  /**
   * "Só esta": muda só a ocorrência (data, hora e feito; ao excluir, ela fica pulada).
   * "Esta e as próximas": o item passa a valer como está no formulário dali em diante (ao excluir, encerra).
   */
  aplicarAlcance(soEsta: boolean) {
    const item = this.item!;
    const original = this.dataOriginal!;
    const acao = this.escolhendo;
    this.escolhendo = null;
    if (acao === 'excluir') {
      this.gravar(soEsta
        ? this.itemService.alterarOcorrencia(this.lista.id, item.id, original, { pulada: true })
        : this.itemService.encerrar(this.lista.id, item.id, original), 'Erro ao excluir.');
      return;
    }
    const v = this.form.getRawValue();
    this.gravar(soEsta
      ? this.itemService.alterarOcorrencia(this.lista.id, item.id, original, {
        feito: v.feito, ...(v.data ? { data: v.data } : {}), ...(!v.diaTodo && v.hora ? { hora: `${v.hora.slice(0, 5)}:00` } : {})
      })
      : this.itemService.dividir(this.lista.id, item.id, original, this.montarPayload()), 'Erro ao salvar o item.');
  }

  cancelarAlcance() {
    this.escolhendo = null;
  }

  private gravar(acao$: Observable<unknown>, erro: string) {
    this.saving = true;
    acao$.pipe(finalize(() => (this.saving = false))).subscribe({
      next: () => this.closed.emit(true),
      error: e => this.alertService.error(extrairMensagemErro(e, erro))
    });
  }
}
