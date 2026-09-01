import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { BancoDto } from 'src/app/core/interfaces/banco.interface';
import { BancoService } from 'src/app/core/services/banco.service';
import { TipoCartao } from 'src/app/core/services/tipo-cartao.service';
import { formataDecimal, parseMoneyBRToNumber } from 'src/app/core/utils/mask';
import { AlertService } from 'src/app/shared/components/alert.service';

type AlertState = { type: 'success' | 'error' | ''; message: string };

@Component({
  selector: 'app-banco-form',
  templateUrl: './banco-form.component.html',
  styleUrls: ['./banco-form.component.scss'],
})
export class BancoFormComponent implements OnInit {
  @Input() banco: BancoDto | null = null;
  @Input() tiposCartao: TipoCartao[] = []; // ✅ novo
  @Output() closed = new EventEmitter<boolean>();

  alert: AlertState = { type: '', message: '' };

  saving = false;

  form = this.fb.group({
    nomeBanco: ['', [Validators.required, Validators.minLength(2)]],
    saldoInicial: [formataDecimal(0), [Validators.required]],
    ativo: [true, [Validators.required]],
    tipoCartaoId: [null as number | null, [Validators.required]], // ✅ novo
  });

  constructor(private fb: FormBuilder, private bancoService: BancoService, private readonly alertService: AlertService) {}

  ngOnInit(): void {
    if (this.banco) {
      this.form.patchValue({
        nomeBanco: this.banco.nomeBanco,
        saldoInicial: formataDecimal(this.banco.saldoInicial),
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
        saldoInicial: parseMoneyBRToNumber(this.form.value.saldoInicial!) ?? 0, // Evita erro do TS
        tipoCartaoId: Number(this.form.value.tipoCartaoId), // ✅ novo
        ativo: !!this.form.value.ativo,
      };

      if (this.banco){
        await this.bancoService.update(payload)
      } 
      else{
        await  this.bancoService.create(payload)
      } 
      
      this.alertService.success(`Banco "${this.form.value.nomeBanco!}" com sucesso!`);      
      setTimeout(() => {
        this.close(true);
      }, 300);

      this.close(true);
    } catch {
      this.alertService.error(`Erro ao salvar Banco "${this.form.value.nomeBanco}".`);
    } finally {
      this.saving = false;
    }
  }
}
