import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { FormBuilder, Validators, ReactiveFormsModule } from '@angular/forms';
import { TipoCartaoService } from 'src/app/core/services/tipo-cartao.service';
import { AlertService } from 'src/app/shared/components/alert.service';
import { extrairMensagemErro } from 'src/app/core/utils/http-error';
import { TipoCartaoDto } from 'src/app/core/models/tipo-cartao.model';
import { finalize } from 'rxjs';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { CheckboxModule } from 'primeng/checkbox';
import { ButtonModule } from 'primeng/button';

@Component({
  selector: 'app-tipo-cartao-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, DialogModule, InputTextModule, CheckboxModule, ButtonModule],
  templateUrl: './tipo-cartao-form.component.html'
})
export class TipoCartaoFormComponent implements OnInit {
  /** Registro em edição; null = novo (mesmo nome nos 5 cadastros, FE-P2-12). */
  @Input() registro: TipoCartaoDto | null = null;   // editar
  @Output() closed = new EventEmitter<boolean>(); // true => recarregar

  saving = false;

  form = this.fb.group({
    nomeTipoCartao: ['', [Validators.required, Validators.minLength(2)]],
    ehCredito: [false],
    // ativo: [true], // descomente se existir no seu backend
  });

  constructor(private fb: FormBuilder, private service: TipoCartaoService, private readonly alertService: AlertService) {}

  ngOnInit(): void {
    if (this.registro) {
      this.form.patchValue({
        nomeTipoCartao: this.registro.nomeTipoCartao,
        ehCredito: this.registro.ehCredito ?? false,
        // ativo: this.registro.ativo ?? true,
      });
      return;
    }

    // Na criação, sugere "crédito" pelo nome enquanto o usuário não mexer no checkbox.
    this.form.controls.nomeTipoCartao.valueChanges.subscribe(nome => {
      if (!this.form.controls.ehCredito.dirty) {
        this.form.controls.ehCredito.setValue(/cr[eé]dito/i.test(nome ?? ''));
      }
    });
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
      nomeTipoCartao: this.form.value.nomeTipoCartao!,
      ehCredito: !!this.form.value.ehCredito,
    };

    this.saving = true;
    (this.registro ? this.service.atualizar(payload) : this.service.criar(payload))
      .pipe(finalize(() => (this.saving = false)))
      .subscribe({
        next: () => {
          this.alertService.success(`Tipo cartão "${payload.nomeTipoCartao}" salvo com sucesso.`);
          this.close(true);
        },
        error: e => this.alertService.error(extrairMensagemErro(e, `Erro ao salvar o Tipo cartão "${payload.nomeTipoCartao}".`))
      });
  }
}
