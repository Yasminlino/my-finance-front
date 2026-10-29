import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { ListaService } from 'src/app/core/services/lista.service';
import { ListaDto, ModeloLista } from 'src/app/core/models/lista.model';
import { finalize } from 'rxjs';
import { extrairMensagemErro } from 'src/app/core/utils/http-error';
import { CAMPOS_DO_MODELO } from '../../listas.regras';

/**
 * Nova/editar lista, provisório até o card #63: o tipo virou modelo, que pré-marca os campos dos itens.
 * Editar sem trocar o modelo mantém os campos da lista; arquivar sai daqui (vai para o ⋮ no #63).
 */
@Component({
  selector: 'app-modal-nova-lista',
  templateUrl: './modal-nova-lista.component.html',
})
export class ModalNovaListaComponent implements OnInit {
  @Input() lista: ListaDto | null = null;
  @Output() closed = new EventEmitter<boolean>();

  saving = false;
  readonly opcoesModelo: { label: string; value: ModeloLista }[] = [
    { label: 'Compras (quantidade + valor)', value: 'COMPRAS' },
    { label: 'Orçamento (valor + limite)', value: 'ORCAMENTO' },
    { label: 'Tarefas (só itens)', value: 'TAREFAS' },
    { label: 'Agenda (data)', value: 'AGENDA' },
    { label: 'Em branco', value: 'BRANCO' }
  ];

  form = this.fb.group({
    nome: ['', [Validators.required, Validators.minLength(2)]],
    modelo: [null as ModeloLista | null, [Validators.required]],
  });

  constructor(private fb: FormBuilder, private listaService: ListaService) {}

  ngOnInit(): void {
    if (this.lista) {
      this.form.patchValue({ nome: this.lista.nome, modelo: this.lista.modelo });
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

    const nome = this.form.value.nome!;
    const modelo = this.form.value.modelo!;
    // Modelo novo pré-marca os campos. O limite fica desligado: este formulário não pede o valor dele,
    // e a API recusa limite ligado sem valor.
    const payload = this.lista?.modelo === modelo
      ? { ...this.lista, nome }
      : { ...this.lista, ...CAMPOS_DO_MODELO[modelo], usaLimite: false, nome, modelo, id: this.lista?.id ?? 0 };

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
