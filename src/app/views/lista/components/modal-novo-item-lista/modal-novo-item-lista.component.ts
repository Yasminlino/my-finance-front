import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';

import { ItemListaService } from 'src/app/core/services/item-lista.service';
import { ItemListaDto, ListaDto } from 'src/app/core/models/lista.model';
import { finalize } from 'rxjs';
import { extrairMensagemErro } from 'src/app/core/utils/http-error';

type AlertState = { type: 'success' | 'error' | ''; message: string };

/** Campos da lista que este formulário respeita (provisório até o formulário dinâmico do card #66). */
export type CamposDoItem = Pick<ListaDto, 'usaQuantidade' | 'usaData'>;

@Component({
  selector: 'app-modal-novo-item-lista',
  templateUrl: './modal-novo-item-lista.component.html',
})
export class ModalNovoItemListaComponent implements OnInit {
  @Input() listaId!: number;
  /** Quantidade e data só aparecem se a lista usa esses campos. */
  @Input() campos: CamposDoItem = { usaQuantidade: false, usaData: false };

  /** Se vier preenchido, a modal vira "Editar Item" */
  @Input() item: ItemListaDto | null = null;

  @Output() closed = new EventEmitter<boolean>();

  alert: AlertState = { type: '', message: '' };
  saving = false;
  readonly opcoesFeito = [
    { label: 'Pendente', value: false },
    { label: 'Ok', value: true },
  ];

  form = this.fb.group({
    descricao: ['', [Validators.required, Validators.minLength(2)]],
    quantidade: [1, [Validators.required, Validators.min(1)]],
    valor: [null as number | null], // opcional; número direto do currencyInput (FE-P2-10)
    observacao: [''],
    feito: [false],
    data: [null as string | null], // yyyy-mm-dd
    hora: [null as string | null], // HH:mm
  });

  constructor(private fb: FormBuilder, private itemListaService: ItemListaService) { }

  ngOnInit(): void {
    if (!this.listaId && this.item?.listaId) {
      this.listaId = this.item.listaId;
    }

    if (this.item) {
      this.form.patchValue({
        descricao: this.item.descricao,
        quantidade: this.item.quantidade ?? 1,
        valor: this.item.valor ?? null,
        observacao: this.item.observacao ?? '',
        feito: !!this.item.feito,
        data: this.item.data ?? null,
        hora: this.item.hora ?? null,
      });
    }
  }

  /** Campo tocado e inválido: borda vermelha (ng-dirty) e mensagem. */
  erro(campo: keyof typeof this.form.controls): boolean {
    const controle = this.form.controls[campo];
    return controle.touched && controle.invalid;
  }

  close(reload = false) {
    this.closed.emit(reload);
  }

  save() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.saving = true;
    this.alert = { type: '', message: '' };

    const payload = {
      id: this.item?.id ?? 0,
      descricao: this.form.value.descricao!,
      quantidade: Number(this.form.value.quantidade),
      feito: !!this.form.value.feito,
      valor: this.form.value.valor ?? undefined,
      observacao: this.form.value.observacao!,
      data: this.form.value.data ?? undefined,
      hora: this.form.value.hora ?? undefined,
    };

    // Fecha só se salvou; antes o erro era engolido pelo .catch e o modal fechava igual.
    (this.item ? this.itemListaService.atualizar(this.listaId, payload) : this.itemListaService.criar(this.listaId, payload))
      .pipe(finalize(() => (this.saving = false)))
      .subscribe({
        next: () => this.close(true),
        error: e => (this.alert = { type: 'error', message: extrairMensagemErro(e, 'Erro ao salvar item.') })
      });
  }

}
