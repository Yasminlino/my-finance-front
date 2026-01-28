import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { TipoCartaoCreateUpdateDto, TipoCartaoDto, TipoCartaoService } from 'src/app/core/services/tipo-cartao.service';

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

  constructor(private fb: FormBuilder, private service: TipoCartaoService) {}

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

      this.close(true);
    } catch {
      alert('Erro ao salvar banco.');
    } finally {
      this.saving = false;
    }
  }
}
