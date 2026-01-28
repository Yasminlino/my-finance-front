import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { BancoDto, BancoService } from 'src/app/core/services/banco.service';
import { TipoCartao } from 'src/app/core/services/tipo-cartao.service';

@Component({
  selector: 'app-banco-form',
  templateUrl: './banco-form.component.html',
  styleUrls: ['./banco-form.component.scss'],
})
export class BancoFormComponent implements OnInit {
  @Input() banco: BancoDto | null = null;
  @Input() tiposCartao: TipoCartao[] = []; // ✅ novo
  @Output() closed = new EventEmitter<boolean>();

  saving = false;

  form = this.fb.group({
    nomeBanco: ['', [Validators.required, Validators.minLength(2)]],
    saldoInicial: [0, [Validators.required]],
    ativo: [true, [Validators.required]],
    tipoCartaoId: [null as number | null, [Validators.required]], // ✅ novo
  });

  constructor(private fb: FormBuilder, private bancoService: BancoService) {}

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

  async save() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    try {
      this.saving = true;

      const payload = {
        id: this.banco?.id || 0,
        nomeBanco: this.form.value.nomeBanco!,
        saldoInicial: Number(this.form.value.saldoInicial) || 0,
        tipoCartaoId: Number(this.form.value.tipoCartaoId), // ✅ novo
        ativo: !!this.form.value.ativo,
      };

      if (this.banco) await this.bancoService.update(payload);
      else await this.bancoService.create(payload);

      this.close(true);
    } catch {
      alert('Erro ao salvar banco.');
    } finally {
      this.saving = false;
    }
  }
}
