import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { TipoMovimentacaoDto } from 'src/app/core/models/tipo-movimentacao.model';
import { TipoMovimentacaoService } from 'src/app/core/services/tipo-movimentacao.service';

@Component({
  selector: 'app-tipo-movimentacao-form',
  templateUrl: './tipo-movimentacao-form.component.html',
  styleUrls: ['./tipo-movimentacao-form.component.scss'],
})
export class TipoMovimentacaoFormComponent implements OnInit {
  @Input() item: TipoMovimentacaoDto | null = null;
  @Output() closed = new EventEmitter<boolean>(); // true => recarrega lista

  saving = false;

  form = this.fb.group({
    nomeTipoMovimentacao: ['', [Validators.required, Validators.minLength(2)]],
    descricao: [''],
    valorMeta: [0, [Validators.required]],
  });

  constructor(private fb: FormBuilder, private service: TipoMovimentacaoService) {}

  ngOnInit(): void {
    if (this.item) {
      this.form.patchValue({
        nomeTipoMovimentacao: this.item.nomeTipoMovimentacao,
        descricao: this.item.descricao ?? '',
        valorMeta: Number(this.item.valorMeta) || 0,
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

    try {
      this.saving = true;

      const payload = {
        id: this.item?.id,
        nomeTipoMovimentacao: this.form.value.nomeTipoMovimentacao!,
        descricao: this.form.value.descricao ?? '',
        valorMeta: Number(this.form.value.valorMeta) || 0,
      };

      if (this.item) await this.service.update(payload);
      else await this.service.create(payload);

      this.close(true);
    } catch {
      alert('Erro ao salvar Tipo de Movimentação.');
    } finally {
      this.saving = false;
    }
  }
}
