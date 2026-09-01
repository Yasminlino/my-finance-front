import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { TipoMovimentacaoDto } from 'src/app/core/models/tipo-movimentacao.model';
import { TipoMovimentacaoService } from 'src/app/core/services/tipo-movimentacao.service';
import { AlertService } from 'src/app/shared/components/alert.service';

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

  constructor(private fb: FormBuilder, private service: TipoMovimentacaoService, private readonly alertService: AlertService) {}

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

      this.alertService.success(`Tipo Movimentação "${this.form.value.nomeTipoMovimentacao!}" salvo com sucesso.`)
      this.close(true);
    } catch {
      this.alertService.success(`Erro ao salvar o Tipo Movimentação  "${this.form.value.nomeTipoMovimentacao!}".`)
    } finally {
      this.saving = false;
    }
  }
}
