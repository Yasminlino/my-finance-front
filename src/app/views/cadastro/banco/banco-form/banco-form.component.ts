import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { BancoService } from 'src/app/core/services/banco.service';
import { AlertService } from 'src/app/shared/components/alert.service';
import { extrairMensagemErro } from 'src/app/core/utils/http-error';
import { BancoDto } from 'src/app/core/models/banco.model';
import { TipoCartaoDto } from 'src/app/core/models/tipo-cartao.model';
import { finalize } from 'rxjs';

type AlertState = { type: 'success' | 'error' | ''; message: string };

@Component({
  selector: 'app-banco-form',
  templateUrl: './banco-form.component.html',
  styleUrls: ['./banco-form.component.scss'],
})
export class BancoFormComponent implements OnInit {
  @Input() banco: BancoDto | null = null;
  @Input() tiposCartao: TipoCartaoDto[] = []; // ✅ novo
  @Output() closed = new EventEmitter<boolean>();

  alert: AlertState = { type: '', message: '' };

  saving = false;

  form = this.fb.group({
    nomeBanco: ['', [Validators.required, Validators.minLength(2)]],
    // Número direto do currencyInput (FE-P2-10).
    saldoInicial: [0 as number | null, [Validators.required]],
    ativo: [true, [Validators.required]],
    tipoCartaoId: [null as number | null, [Validators.required]], // ✅ novo
  });

  constructor(private fb: FormBuilder, private bancoService: BancoService, private readonly alertService: AlertService) {}

  ngOnInit(): void {
    if (this.banco) {
      this.form.patchValue({
        nomeBanco: this.banco.nomeBanco,
        saldoInicial: this.banco.saldoInicial,
        ativo: this.banco.ativo,
        tipoCartaoId: this.banco.tipoCartaoId ?? null,
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
      id: this.banco?.id || 0,
      nomeBanco: this.form.value.nomeBanco!,
      saldoInicial: this.form.value.saldoInicial ?? 0,
      tipoCartaoId: Number(this.form.value.tipoCartaoId),
      ativo: !!this.form.value.ativo,
    };

    this.saving = true;
    (this.banco ? this.bancoService.atualizar(payload) : this.bancoService.criar(payload))
      .pipe(finalize(() => (this.saving = false)))
      .subscribe({
        next: () => {
          this.alertService.success(`Banco "${payload.nomeBanco}" salvo com sucesso!`);
          this.close(true);
        },
        error: e => this.alertService.error(extrairMensagemErro(e, `Erro ao salvar Banco "${payload.nomeBanco}".`))
      });
  }
}
