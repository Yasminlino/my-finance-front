import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { ItemListaService } from 'src/app/core/services/item-lista.service';
import { ItemListaDto } from 'src/app/core/models/lista.model';
import { finalize } from 'rxjs';
import { extrairMensagemErro } from 'src/app/core/utils/http-error';

/** Descrição só com espaços conta como vazia. */
const naoVazio = Validators.pattern(/\S/);

@Component({
  selector: 'app-modal-item-checagem',
  templateUrl: './modal-item-checagem.component.html'
})
export class ModalItemChecagemComponent implements OnInit {

  @Input() listaId!: number;
  @Input() item: ItemListaDto | null = null;

  @Output() closed = new EventEmitter<boolean>();

  /** Formulário Reactive (FE-P2-10); "concluído" é o feito do item (card #67). */
  readonly form = this.fb.group({
    descricao: ['', [Validators.required, naoVazio]],
    quantidade: [1 as number | null, [Validators.required, Validators.min(1)]],
    concluido: [false]
  });

  loading = false;
  errorMsg = '';

  constructor(private readonly fb: FormBuilder, private readonly service: ItemListaService) {}

  get isEdit(): boolean {
    return !!this.item;
  }

  ngOnInit() {
    if (this.item) {
      this.form.patchValue({
        descricao: this.item.descricao ?? '',
        quantidade: this.item.quantidade ?? 1,
        concluido: !!this.item.feito
      });
    }
  }

  invalido(campo: keyof typeof this.form.controls): boolean {
    const controle = this.form.controls[campo];
    return controle.invalid && controle.touched;
  }

  fechar(reload = false) {
    this.closed.emit(reload);
  }

  salvar() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const { descricao, quantidade, concluido } = this.form.getRawValue();
    const dados = { descricao: (descricao ?? '').trim(), quantidade: Number(quantidade), feito: !!concluido };

    this.loading = true;
    this.errorMsg = '';
    // Fecha só se salvou.
    (this.item ? this.service.atualizar(this.listaId, { ...this.item, ...dados }) : this.service.criar(this.listaId, dados))
      .pipe(finalize(() => (this.loading = false)))
      .subscribe({
        next: () => this.fechar(true),
        error: e => (this.errorMsg = extrairMensagemErro(e, 'Erro ao salvar.'))
      });
  }
}
