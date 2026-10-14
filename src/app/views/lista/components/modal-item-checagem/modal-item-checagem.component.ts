import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { ItemListaService } from 'src/app/core/services/item-lista.service';
import { ItemListaDto } from 'src/app/core/models/lista.model';
import { finalize } from 'rxjs';
import { extrairMensagemErro } from 'src/app/core/utils/http-error';

type AlertState = { type: 'success' | 'error' | ''; message: string };

@Component({
  selector: 'app-modal-item-checagem',
  templateUrl: './modal-item-checagem.component.html',
  styleUrls: ['./modal-item-checagem.component.scss']
})
export class ModalItemChecagemComponent implements OnInit {

  @Input() listaId!: number;
  @Input() item: ItemListaDto | null = null;

  @Output() closed = new EventEmitter<boolean>();

  
  alert: AlertState = { type: '', message: '' };

  form: Partial<ItemListaDto> = {
    descricao: '',
    quantidade: 1,
    status: 'PENDENTE'
  };

  loading = false;
  errorMsg = '';
  isEdit = false;

  constructor(private service: ItemListaService) {}

  ngOnInit() {
    if (this.item) {
      this.isEdit = true;
      this.form = { ...this.item };
    }
  }

  fechar(reload = false) {
    this.closed.emit(reload);
  }

  salvar() {
    if (!this.form.descricao?.trim()) {
      this.errorMsg = 'Informe a descrição.';
      return;
    }
    if (!this.form.quantidade) {
      this.errorMsg = 'Informe a quantidade.';
      return;
    }

    this.loading = true;
    this.errorMsg = '';
    // Fecha só se salvou; antes o erro do create era engolido e o modal fechava igual.
    (this.isEdit ? this.service.atualizar(this.form) : this.service.criar({ ...this.form, listaId: this.listaId }))
      .pipe(finalize(() => (this.loading = false)))
      .subscribe({
        next: () => this.fechar(true),
        error: e => (this.errorMsg = extrairMensagemErro(e, 'Erro ao salvar.'))
      });
  }

  toggleStatus() {
    this.form.status =
      this.form.status === 'OK' ? 'PENDENTE' : 'OK';
  }
}