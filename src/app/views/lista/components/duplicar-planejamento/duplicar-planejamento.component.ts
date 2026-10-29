import { NgTemplateOutlet } from '@angular/common';
import { Component, EventEmitter, Input, OnInit, Output, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { InputSwitchModule } from 'primeng/inputswitch';
import { InputTextModule } from 'primeng/inputtext';
import { SidebarModule } from 'primeng/sidebar';
import { finalize } from 'rxjs';
import { ListaDto } from 'src/app/core/models/lista.model';
import { LarguraTelaService } from 'src/app/core/services/largura-tela.service';
import { ListaService } from 'src/app/core/services/lista.service';
import { extrairMensagemErro } from 'src/app/core/utils/http-error';
import { AlertService } from 'src/app/shared/components/alert.service';
import { FieldErrorComponent } from 'src/app/shared/ui/field-error/field-error.component';
import { nomeDoMesSeguinte } from '../../listas.regras';

/** O nome não pode ser só espaços. */
const naoVazio = Validators.pattern(/\S/);

/**
 * Duplicar planejamento (card #63): p-dialog no desktop, bottom sheet no celular. A cópia fica sempre na
 * mesma série da original (a comparação é o card #68).
 */
@Component({
  selector: 'app-duplicar-planejamento',
  standalone: true,
  imports: [NgTemplateOutlet, ReactiveFormsModule, ButtonModule, DialogModule, InputSwitchModule, InputTextModule, SidebarModule, FieldErrorComponent],
  templateUrl: './duplicar-planejamento.component.html'
})
export class DuplicarPlanejamentoComponent implements OnInit {
  @Input({ required: true }) lista!: ListaDto;
  @Output() fechado = new EventEmitter<void>();
  @Output() duplicado = new EventEmitter<ListaDto>();

  private readonly fb = inject(FormBuilder);
  private readonly listaService = inject(ListaService);
  private readonly alertService = inject(AlertService);
  readonly movel = inject(LarguraTelaService).movel;

  /** Para o nome sugerido; o teste fixa o dia. */
  hoje = new Date();
  visivel = true;
  saving = false;

  readonly form = this.fb.group({
    nome: this.fb.nonNullable.control('', [Validators.required, naoVazio, Validators.maxLength(120)]),
    copiarItens: this.fb.nonNullable.control(true),
    manterValores: this.fb.nonNullable.control(true),
    arquivarOriginal: this.fb.nonNullable.control(true)
  });

  ngOnInit(): void {
    this.form.controls.nome.setValue(nomeDoMesSeguinte(this.lista.nome, this.hoje));
  }

  fechar() {
    if (this.saving) return;
    this.visivel = false;
    this.fechado.emit();
  }

  duplicar() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const v = this.form.getRawValue();
    const opcoes = {
      nome: v.nome.trim(),
      copiarItens: v.copiarItens,
      manterValores: v.copiarItens && this.lista.usaValor && v.manterValores,
      arquivarOriginal: v.arquivarOriginal
    };

    this.saving = true;
    this.listaService.duplicar(this.lista.id, opcoes)
      .pipe(finalize(() => (this.saving = false)))
      .subscribe({
        next: copia => {
          this.visivel = false;
          this.duplicado.emit(copia);
        },
        error: e => this.alertService.error(extrairMensagemErro(e, 'Erro ao duplicar o planejamento.'))
      });
  }
}
