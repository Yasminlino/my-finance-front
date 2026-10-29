import { Component, EventEmitter, Input, OnInit, Output, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { InputNumberModule } from 'primeng/inputnumber';
import { InputSwitchModule } from 'primeng/inputswitch';
import { InputTextModule } from 'primeng/inputtext';
import { InputTextareaModule } from 'primeng/inputtextarea';
import { MessageModule } from 'primeng/message';
import { Observable, finalize } from 'rxjs';
import { ItemListaDto, ListaDto } from 'src/app/core/models/lista.model';
import { ConfirmacaoService } from 'src/app/core/services/confirmacao.service';
import { ItemListaService } from 'src/app/core/services/item-lista.service';
import { extrairMensagemErro } from 'src/app/core/utils/http-error';
import { formatCurrencyBR } from 'src/app/core/utils/mask';
import { AlertService } from 'src/app/shared/components/alert.service';
import { FieldErrorComponent } from 'src/app/shared/ui/field-error/field-error.component';
import { FormPanelComponent } from 'src/app/shared/ui/form-panel/form-panel.component';
import { totalDoItem } from '../../planejamento.regras';

/** Descrição só com espaços conta como vazia. */
const naoVazio = Validators.pattern(/\S/);

/**
 * Novo/editar item do planejamento (card #66), no lugar dos dois modais das telas antigas: mostra só os campos
 * ligados. O que fica escondido (campo desligado, repetição, ordem) é gravado como estava.
 */
@Component({
  selector: 'app-item-planejamento-form',
  standalone: true,
  imports: [
    ReactiveFormsModule, ButtonModule, InputNumberModule, InputSwitchModule, InputTextModule, InputTextareaModule, MessageModule,
    FieldErrorComponent, FormPanelComponent
  ],
  templateUrl: './item-planejamento-form.component.html'
})
export class ItemPlanejamentoFormComponent implements OnInit {
  @Input({ required: true }) lista!: ListaDto;
  /** Em edição; null = novo. */
  @Input() item: ItemListaDto | null = null;
  /** true = gravou ou excluiu (a tela recarrega). */
  @Output() closed = new EventEmitter<boolean>();

  private readonly fb = inject(FormBuilder);
  private readonly itemService = inject(ItemListaService);
  private readonly confirmacao = inject(ConfirmacaoService);
  private readonly alertService = inject(AlertService);

  saving = false;

  readonly form = this.fb.group({
    descricao: this.fb.nonNullable.control('', [Validators.required, naoVazio, Validators.maxLength(200)]),
    quantidade: this.fb.control<number | null>(1, [Validators.min(1)]),
    valor: this.fb.control<number | null>(null, [Validators.min(0)]),
    data: this.fb.control<string | null>(null),
    hora: this.fb.control<string | null>(null),
    observacao: this.fb.control<string | null>(null, [Validators.maxLength(500)]),
    feito: this.fb.nonNullable.control(false)
  });

  get titulo(): string {
    return this.item ? 'Editar item' : 'Novo item';
  }

  get repete(): boolean {
    return !!this.item?.repeticao && this.item.repeticao !== 'NENHUMA';
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
        descricao: i.descricao ?? '', quantidade: i.quantidade ?? 1, valor: i.valor ?? null, data: i.data ?? null,
        hora: i.hora ? i.hora.slice(0, 5) : null, observacao: i.observacao ?? null, feito: !!i.feito
      });
    }
  }

  moeda(valor: number): string {
    return formatCurrencyBR(valor);
  }

  close() {
    this.closed.emit(false);
  }

  save() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const v = this.form.getRawValue();
    const l = this.lista;
    const antes = this.item;
    // Campo desligado: fica o que estava (no novo, vazio). Desligar só esconde (card #63).
    const payload: Partial<ItemListaDto> & { id: number } = {
      ...antes,
      id: antes?.id ?? 0,
      descricao: v.descricao.trim(),
      feito: v.feito,
      quantidade: l.usaQuantidade ? v.quantidade : antes?.quantidade ?? null,
      valor: l.usaValor ? v.valor : antes?.valor ?? null,
      data: l.usaData ? v.data || null : antes?.data ?? null,
      hora: l.usaData ? (v.hora ? `${v.hora}:00` : null) : antes?.hora ?? null,
      observacao: l.usaObservacao ? v.observacao?.trim() || null : antes?.observacao ?? null
    };

    const gravar$: Observable<unknown> = antes
      ? this.itemService.atualizar(l.id, payload)
      : this.itemService.criar(l.id, payload);
    this.saving = true;
    gravar$.pipe(finalize(() => (this.saving = false))).subscribe({
      next: () => this.closed.emit(true),
      error: e => this.alertService.error(extrairMensagemErro(e, 'Erro ao salvar o item.'))
    });
  }

  async excluir() {
    if (!this.item) return;
    const ok = await this.confirmacao.confirmar(`Excluir o item "${this.item.descricao}"?`, { titulo: 'Excluir item' });
    if (!ok) return;
    this.itemService.excluir(this.lista.id, this.item.id).subscribe({
      next: () => this.closed.emit(true),
      error: e => this.alertService.error(extrairMensagemErro(e, 'Erro ao excluir o item.'))
    });
  }
}
