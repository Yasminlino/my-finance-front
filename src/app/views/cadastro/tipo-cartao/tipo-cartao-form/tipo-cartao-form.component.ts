import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { TipoCartaoDto, TipoCartaoService } from 'src/app/core/services/tipo-cartao.service';
import { AlertService } from 'src/app/shared/components/alert.service';
import { extrairMensagemErro } from 'src/app/core/utils/http-error';

@Component({
  selector: 'app-tipo-cartao-form',
  templateUrl: './tipo-cartao-form.component.html',
  styleUrls: ['./tipo-cartao-form.component.scss'],
})
export class TipoCartaoFormComponent implements OnInit {
  @Input() item: TipoCartaoDto | null = null;   // editar
  @Output() closed = new EventEmitter<boolean>(); // true => recarregar

  saving = false;

  form = this.fb.group({
    nomeTipoCartao: ['', [Validators.required, Validators.minLength(2)]],
    // ativo: [true], // descomente se existir no seu backend
  });

  constructor(private fb: FormBuilder, private service: TipoCartaoService, private readonly alertService: AlertService) {}

  ngOnInit(): void {
    if (this.item) {
      this.form.patchValue({
        nomeTipoCartao: this.item.nomeTipoCartao,
        // ativo: this.item.ativo ?? true,
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
        nomeTipoCartao: this.form.value.nomeTipoCartao!,
        // ativo: this.form.value.ativo ?? true,
      };

      if (this.item) await this.service.update(payload);
      else await this.service.create(payload);

      this.alertService.success(`Tipo cartão "${this.form.value.nomeTipoCartao!}" salvo com sucesso.`)
      this.close(true);
    } catch (e) {
      this.alertService.error(extrairMensagemErro(e, `Erro ao salvar o Tipo cartão "${this.form.value.nomeTipoCartao!}".`))
    } finally {
      this.saving = false;
    }
  }
}
