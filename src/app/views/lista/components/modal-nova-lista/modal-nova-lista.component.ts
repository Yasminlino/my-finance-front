import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { ListaDto, ListaService } from 'src/app/core/services/lista.service';
import { TipoCartao } from 'src/app/core/services/tipo-cartao.service';


type AlertState = { type: 'success' | 'error' | ''; message: string };
@Component({
  selector: 'app-modal-nova-lista',
  templateUrl: './modal-nova-lista.component.html',
  styleUrls: ['./modal-nova-lista.component.scss'],
})
export class ModalNovaListaComponent implements OnInit {
  @Input() lista: ListaDto | null = null;
  @Input() tiposCartao: TipoCartao[] = []; 
  @Output() closed = new EventEmitter<boolean>();

  
  alert: AlertState = { type: '', message: '' };

  saving = false;

  form = this.fb.group({
    nome: ['', [Validators.required, Validators.minLength(2)]],
    status: [true, [Validators.required]],
    tipoMovimentacao: [null as number | null, [Validators.required]], // ✅ novo
  });

  constructor(private fb: FormBuilder, private listaService: ListaService) {}

  ngOnInit(): void {
    if (this.lista) {
      this.form.patchValue({
        nome: this.lista.nome,
        status: this.lista.status,
        tipoMovimentacao: this.lista.tipoMovimentacao ?? null,
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
        id: this.lista?.id || 0,
        nome: this.form.value.nome!,
        tipoMovimentacao: Number(this.form.value.tipoMovimentacao), 
        status: !!this.form.value.status,
      };

      if (this.lista) await this.listaService.update(payload);
      else {await this.listaService.create(payload)
        .then(async (res) => {
          this.alert = { type: 'success', message: 'Conta criada com sucesso!' };
        })
        .catch(() => { 
          this.alert = { type: 'error', message: 'Erro ao criar lista.' };
        });

      }

      this.close(true);
    } catch {
      alert('Erro ao salvar lista.');
    } finally {
      this.saving = false;
    }
  }
}
