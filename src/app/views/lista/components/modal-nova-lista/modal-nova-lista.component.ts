import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { ListaService } from 'src/app/core/services/lista.service';
import { ListaDto } from 'src/app/core/models/lista.model';
import { TipoCartaoDto } from 'src/app/core/models/tipo-cartao.model';
import { finalize } from 'rxjs';
import { extrairMensagemErro } from 'src/app/core/utils/http-error';


type AlertState = { type: 'success' | 'error' | ''; message: string };
@Component({
  selector: 'app-modal-nova-lista',
  templateUrl: './modal-nova-lista.component.html',
  styleUrls: ['./modal-nova-lista.component.scss'],
})
export class ModalNovaListaComponent implements OnInit {
  @Input() lista: ListaDto | null = null;
  @Input() tiposCartao: TipoCartaoDto[] = []; 
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

  save() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const payload = {
      id: this.lista?.id || 0,
      nome: this.form.value.nome!,
      tipoMovimentacao: Number(this.form.value.tipoMovimentacao),
      status: !!this.form.value.status,
    };

    this.saving = true;
    // Fecha só se salvou; antes o erro do create era engolido e o modal fechava igual.
    (this.lista ? this.listaService.atualizar(payload) : this.listaService.criar(payload))
      .pipe(finalize(() => (this.saving = false)))
      .subscribe({
        next: () => this.close(true),
        error: e => alert(extrairMensagemErro(e, 'Erro ao salvar lista.'))
      });
  }
}
