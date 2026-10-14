import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { FormBuilder, Validators, ReactiveFormsModule } from '@angular/forms';
import { TipoMovimentacaoDto } from 'src/app/core/models/tipo-movimentacao.model';
import { TipoMovimentacaoService } from 'src/app/core/services/tipo-movimentacao.service';
import { AlertService } from 'src/app/shared/components/alert.service';
import { finalize } from 'rxjs';
import { extrairMensagemErro } from 'src/app/core/utils/http-error';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { ButtonModule } from 'primeng/button';

@Component({
  selector: 'app-tipo-movimentacao-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, DialogModule, InputTextModule, ButtonModule],
  templateUrl: './tipo-movimentacao-form.component.html'
})
export class TipoMovimentacaoFormComponent implements OnInit {
  /** Registro em edição; null = novo (mesmo nome nos 5 cadastros, FE-P2-12). */
  @Input() registro: TipoMovimentacaoDto | null = null;
  @Output() closed = new EventEmitter<boolean>(); // true => recarrega lista

  saving = false;

  form = this.fb.group({
    nomeTipoMovimentacao: ['', [Validators.required, Validators.minLength(2)]],
    descricao: [''],
    valorMeta: [0, [Validators.required]],
  });

  constructor(private fb: FormBuilder, private service: TipoMovimentacaoService, private readonly alertService: AlertService) {}

  ngOnInit(): void {
    if (this.registro) {
      this.form.patchValue({
        nomeTipoMovimentacao: this.registro.nomeTipoMovimentacao,
        descricao: this.registro.descricao ?? '',
        valorMeta: Number(this.registro.valorMeta) || 0,
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

    const payload = {
      id: this.registro?.id,
      nomeTipoMovimentacao: this.form.value.nomeTipoMovimentacao!,
      descricao: this.form.value.descricao ?? '',
      valorMeta: Number(this.form.value.valorMeta) || 0,
    };

    this.saving = true;
    (this.registro ? this.service.atualizar(payload) : this.service.criar(payload))
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
