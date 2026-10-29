import { Component, ElementRef, EventEmitter, Input, Output, ViewChild, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { InputNumberModule } from 'primeng/inputnumber';
import { InputTextModule } from 'primeng/inputtext';
import { finalize } from 'rxjs';
import { ItemListaDto, ListaDto } from 'src/app/core/models/lista.model';
import { ItemListaService } from 'src/app/core/services/item-lista.service';
import { extrairMensagemErro } from 'src/app/core/utils/http-error';
import { AlertService } from 'src/app/shared/components/alert.service';

/**
 * Adicionar rápido da tela interna (card #66): descrição e, se o planejamento usa, quantidade e valor.
 * Enter grava; o campo limpa e o foco volta para a descrição, para emendar o próximo.
 */
@Component({
  selector: 'app-adicionar-item',
  standalone: true,
  imports: [ReactiveFormsModule, ButtonModule, InputNumberModule, InputTextModule],
  templateUrl: './adicionar-item.component.html',
  styleUrls: ['./adicionar-item.component.scss']
})
export class AdicionarItemComponent {
  @Input({ required: true }) lista!: ListaDto;
  @Output() adicionado = new EventEmitter<ItemListaDto>();
  @ViewChild('campoDescricao') campoDescricao?: ElementRef<HTMLInputElement>;

  private readonly fb = inject(FormBuilder);
  private readonly itemService = inject(ItemListaService);
  private readonly alertService = inject(AlertService);

  saving = false;

  readonly form = this.fb.group({
    descricao: this.fb.nonNullable.control('', [Validators.required, Validators.pattern(/\S/), Validators.maxLength(200)]),
    quantidade: this.fb.control<number | null>(1, [Validators.min(1)]),
    valor: this.fb.control<number | null>(null, [Validators.min(0)])
  });

  get placeholder(): string {
    return this.lista.modelo === 'TAREFAS' || this.lista.modelo === 'AGENDA' ? 'Adicionar tarefa...' : 'Adicionar item...';
  }

  adicionar() {
    if (this.saving || this.form.invalid) return;

    const v = this.form.getRawValue();
    const dto: Partial<ItemListaDto> = { descricao: v.descricao.trim(), feito: false };
    if (this.lista.usaQuantidade) dto.quantidade = v.quantidade ?? 1;
    if (this.lista.usaValor) dto.valor = v.valor;

    this.saving = true;
    this.itemService.criar(this.lista.id, dto)
      .pipe(finalize(() => (this.saving = false)))
      .subscribe({
        next: criado => {
          this.adicionado.emit(criado);
          // Foco antes de limpar: ao perder o foco, o p-inputNumber relê o texto que ainda mostra e devolveria
          // o valor antigo ao form (o item seguinte saía com o valor do anterior).
          this.campoDescricao?.nativeElement.focus();
          this.form.reset({ descricao: '', quantidade: 1, valor: null });
        },
        error: e => this.alertService.error(extrairMensagemErro(e, 'Erro ao adicionar o item.'))
      });
  }
}
