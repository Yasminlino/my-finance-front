import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { TipoMovimentacaoDto } from 'src/app/core/models/tipo-movimentacao.model';
import { TipoMovimentacaoService } from 'src/app/core/services/tipo-movimentacao.service';
import { AlertService } from 'src/app/shared/components/alert.service';
import { finalize } from 'rxjs';
import { extrairMensagemErro } from 'src/app/core/utils/http-error';

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

  save() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const payload = {
      id: this.item?.id,
      nomeTipoMovimentacao: this.form.value.nomeTipoMovimentacao!,
      descricao: this.form.value.descricao ?? '',
      valorMeta: Number(this.form.value.valorMeta) || 0,
    };

    this.saving = true;
    (this.item ? this.service.atualizar(payload) : this.service.criar(payload))
      .pipe(finalize(() => (this.saving = false)))
      .subscribe({
        next: () => {
          this.alertService.success(`Tipo Movimentação "${payload.nomeTipoMovimentacao}" salvo com sucesso.`);
          this.close(true);
        },
        // Antes o erro aparecia num alerta de sucesso.
        error: e => this.alertService.error(extrairMensagemErro(e, `Erro ao salvar o Tipo Movimentação "${payload.nomeTipoMovimentacao}".`))
      });
  }
}
