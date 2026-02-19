import { Time } from '@angular/common';
import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';

// Ajuste esses imports para o seu projeto
import { ItemListaDto, ItemListaService } from 'src/app/core/services/item-lista.service';

type AlertState = { type: 'success' | 'error' | ''; message: string };

@Component({
  selector: 'app-modal-novo-item-lista',
  templateUrl: './modal-novo-item-lista.component.html',
  styleUrls: ['./modal-novo-item-lista.component.scss'],
})
export class ModalNovoItemListaComponent implements OnInit {
  @Input() listaId!: number;
  @Input() tipoLista: number = 0;

  /** Se vier preenchido, a modal vira "Editar Item" */
  @Input() item: ItemListaDto | null = null;

  @Output() closed = new EventEmitter<boolean>();

  alert: AlertState = { type: '', message: '' };
  saving = false;

  form = this.fb.group({
    descricao: ['', [Validators.required, Validators.minLength(2)]],
    quantidade: [1, [Validators.required, Validators.min(1)]],
    valor: [null as number | null], // opcional
    status: ['Comprado', [Validators.required]], // 'Pendente' | 'Comprado'
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
        status: this.item.status ?? 'Pendente',
        dataTarefa: this.item.dataTarefa ?? null,
        horarioTarefa: this.item.horarioTarefa ?? null,
      });
    }
  }

  close(reload = false) {
    this.closed.emit(reload);
  }

  async save() {
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
      status: this.form.value.status!,
      valor: this.form.value.valor ?? undefined,
      dataTarefa: this.form.value.dataTarefa ?? undefined,
      horarioTarefa: this.form.value.horarioTarefa ?? undefined,
    };

    try {
      if (this.item) {
        await this.itemListaService.update(payload).then(() => {
          this.alert = { type: 'success', message: 'Item atualizado com sucesso!' };
        }).catch(() => {
          this.alert = { type: 'error', message: 'Erro ao atualizar item.' };
        });
      } else {
        await this.itemListaService.create(payload).then(() => {
          this.alert = { type: 'success', message: 'Item criado com sucesso!' };
        }).catch(() => {
          this.alert = { type: 'error', message: 'Erro ao criar item.' };
        });     
      }

      this.close(true); // ✅ só fecha se salvou
    } catch (e) {
      console.error(e);
      this.alert = { type: 'error', message: 'Erro ao salvar item.' };
    } finally {
      this.saving = false;
    }
  }

}
