import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { ItemListaService, ItemListaDto } from 'src/app/core/services/item-lista.service';

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

  async salvar() {
    if (!this.form.descricao?.trim()) {
      this.errorMsg = 'Informe a descrição.';
      return;
    }
    if (!this.form.quantidade) {
      this.errorMsg = 'Informe a quantidade.';
      return;
    }

    try {
      this.loading = true;
      this.errorMsg = '';

      if (this.isEdit) {
        await this.service.update(this.form);
      } else {
        await this.service.create({
          ...this.form,
          listaId: this.listaId
        }).then(() => {
          this.alert = { type: 'success', message: 'Item criado com sucesso!' };
        }).catch((e) => {
          this.alert = { type: 'error', message: e?.message ?? 'Erro ao criar item.' };
        });
      }

      this.fechar(true);

    } catch (e: any) {
      this.errorMsg = e?.message ?? 'Erro ao salvar.';
    } finally {
      this.loading = false;
    }
  }

  toggleStatus() {
    this.form.status =
      this.form.status === 'CONCLUIDO' ? 'PENDENTE' : 'CONCLUIDO';
  }
}