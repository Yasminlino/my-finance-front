import { Time } from '@angular/common';
import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';

// Ajuste esses imports para o seu projeto
import { ItemListaService } from 'src/app/core/services/item-lista.service';
import { ItemListaDto } from 'src/app/core/models/lista.model';
import { finalize } from 'rxjs';
import { extrairMensagemErro } from 'src/app/core/utils/http-error';

type AlertState = { type: 'success' | 'error' | ''; message: string };

@Component({
  selector: 'app-modal-novo-item-lista',
  templateUrl: './modal-novo-item-lista.component.html',
})
export class ModalNovoItemListaComponent implements OnInit {
  @Input() listaId!: number;
  @Input() tipoLista: number = 0;

  /** Se vier preenchido, a modal vira "Editar Item" */
  @Input() item: ItemListaDto | null = null;

  @Output() closed = new EventEmitter<boolean>();

  alert: AlertState = { type: '', message: '' };
  saving = false;
  /** Mesmo domínio do CHECK de ItemLista.Status (DB-P1-03). */
  readonly opcoesStatus = [
    { label: 'Pendente', value: 'PENDENTE' },
    { label: 'Aguardando', value: 'AGUARDANDO' },
    { label: 'Ok', value: 'OK' },
  ];

  form = this.fb.group({
    descricao: ['', [Validators.required, Validators.minLength(2)]],
    quantidade: [1, [Validators.required, Validators.min(1)]],
    valor: [null as number | null], // opcional; número direto do currencyInput (FE-P2-10)
    observacao: [''],
    status: ['PENDENTE', [Validators.required]], // PENDENTE | AGUARDANDO | OK
    dataTarefa: [null as Date | null], // yyyy-mm-dd
    horarioTarefa: [null as Time | null], // HH:mm
  });

  constructor(private fb: FormBuilder, private itemListaService: ItemListaService) { }

  ngOnInit(): void {
    if (!this.listaId && this.item?.listaId) {
      this.listaId = this.item.listaId;
    }

    if (this.item) {
      this.form.patchValue({
        descricao: this.item.descricao,
        quantidade: this.item.quantidade,
        valor: this.item.valor ?? null,
        observacao: this.item.observacao,
        status: this.item.situacao ?? 'PENDENTE',
        dataTarefa: this.item.dataTarefa ?? null,
        horarioTarefa: this.item.horarioTarefa ?? null,
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
      listaId: this.listaId,
      descricao: this.form.value.descricao!,
      quantidade: Number(this.form.value.quantidade),
      situacao: this.form.value.status!,
      valor: this.form.value.valor ?? undefined,
      observacao: this.form.value.observacao!,
      dataTarefa: this.form.value.dataTarefa ?? undefined,
      horarioTarefa: this.form.value.horarioTarefa ?? undefined,
    };

    // Fecha só se salvou; antes o erro era engolido pelo .catch e o modal fechava igual.
    (this.item ? this.itemListaService.atualizar(payload) : this.itemListaService.criar(payload))
      .pipe(finalize(() => (this.saving = false)))
      .subscribe({
        next: () => this.close(true),
        error: e => (this.alert = { type: 'error', message: extrairMensagemErro(e, 'Erro ao salvar item.') })
      });
  }

}
