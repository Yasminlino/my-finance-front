import { Component, EventEmitter, Input, Output, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { finalize } from 'rxjs';
import { PessoaMovimentacaoDto } from 'src/app/core/models/pessoa-movimentacao.model';
import { PessoaMovimentacaoService } from 'src/app/core/services/pessoa-movimentacao.service';
import { extrairMensagemErro } from 'src/app/core/utils/http-error';
import { AlertService } from '../alert.service';

/**
 * Card #79: cadastrar uma pessoa que usa o cartão ("Carlos") ali mesmo — na lista de pessoas, no "Quem usa este
 * cartão" e no cadastro da conta. Sem isso, quem ainda não tem cartão compartilhado não teria onde criar a primeira.
 */
@Component({
  selector: 'app-nova-pessoa',
  standalone: true,
  imports: [FormsModule, ButtonModule, InputTextModule],
  template: `
    <form class="flex gap-2" (ngSubmit)="adicionar()">
      <input pInputText [id]="inputId" name="nova-pessoa" class="flex-1 min-w-0" maxlength="120" autocomplete="off"
        [placeholder]="placeholder" [(ngModel)]="nome" [disabled]="salvando" aria-label="Nome da pessoa" />
      <p-button type="submit" label="Adicionar" icon="pi pi-plus" [outlined]="true" [loading]="salvando" [disabled]="!nome.trim()" />
    </form>
  `
})
export class NovaPessoaComponent {
  @Input() inputId = 'nova-pessoa';
  @Input() placeholder = 'Nome de quem usa o cartão';
  /** A pessoa criada (ou a que já tinha esse nome). */
  @Output() criada = new EventEmitter<PessoaMovimentacaoDto>();

  nome = '';
  salvando = false;

  private readonly pessoas = inject(PessoaMovimentacaoService);
  private readonly alert = inject(AlertService);

  adicionar(): void {
    const nome = this.nome.trim();
    if (!nome || this.salvando) return;
    this.salvando = true;
    this.pessoas.criar({ nomePessoa: nome })
      .pipe(finalize(() => (this.salvando = false)))
      .subscribe({
        next: pessoa => {
          this.nome = '';
          this.criada.emit(pessoa);
        },
        error: e => this.alert.error(extrairMensagemErro(e, 'Não foi possível cadastrar a pessoa.'))
      });
  }
}
