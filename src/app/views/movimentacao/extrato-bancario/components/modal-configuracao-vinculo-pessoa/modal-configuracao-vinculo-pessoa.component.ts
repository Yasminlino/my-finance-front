import { Component, EventEmitter, Input, OnInit, Output, inject } from '@angular/core';
import { finalize } from 'rxjs';
import { PessoaMovimentacaoDto } from 'src/app/core/models/pessoa-movimentacao.model';
import { ConfirmacaoService } from 'src/app/core/services/confirmacao.service';
import { PessoaMovimentacaoService } from 'src/app/core/services/pessoa-movimentacao.service';
import { extrairMensagemErro } from 'src/app/core/utils/http-error';
import { AlertService } from 'src/app/shared/components/alert.service';
import { NovaPessoaComponent } from 'src/app/shared/components/nova-pessoa/nova-pessoa.component';
import { SharedModule } from 'src/app/shared/shared.module';
import { ModalComponent, ModalRodapeDirective } from 'src/app/shared/ui/modal/modal.component';
import { ROTULO_TITULAR } from '../../extrato.regras';

/**
 * "Pessoas que usam meus cartões" (card #79): quem usa o cartão ("Carlos"), cadastrado à mão. Toda pessoa da lista
 * entra nos Acertos. O nome que vem no extrato ("CIRCUITO") não fica aqui: ele é classificado em "Nomes e regras".
 */
@Component({
  selector: 'app-modal-configuracao-vinculo-pessoa',
  standalone: true,
  imports: [SharedModule, NovaPessoaComponent, ModalComponent, ModalRodapeDirective],
  templateUrl: './modal-configuracao-vinculo-pessoa.component.html',
})
export class ModalConfiguracaoVinculoPessoaComponent implements OnInit {
  /** Mantido para as telas que já passam o mês; a lista não depende dele. */
  @Input() monthFilter?: string;
  /** true = mudou alguma pessoa (a tela de trás recarrega). */
  @Output() closed = new EventEmitter<boolean>();

  readonly rotuloTitular = ROTULO_TITULAR;
  titular: PessoaMovimentacaoDto | null = null;
  pessoas: PessoaMovimentacaoDto[] = [];
  loading = false;
  excluindoId: number | null = null;
  private mudou = false;

  private readonly service = inject(PessoaMovimentacaoService);
  private readonly confirmacao = inject(ConfirmacaoService);
  private readonly alert = inject(AlertService);

  ngOnInit(): void {
    this.carregar();
  }

  close(): void {
    this.closed.emit(this.mudou);
  }

  aoCriar(pessoa: PessoaMovimentacaoDto): void {
    this.mudou = true;
    this.alert.success(`${pessoa.nomePessoa} cadastrada.`);
    this.carregar();
  }

  async excluir(pessoa: PessoaMovimentacaoDto): Promise<void> {
    if (!(await this.confirmacao.confirmar(`Excluir ${pessoa.nomePessoa}? As compras dela ficam sem pessoa.`))) return;
    this.excluindoId = pessoa.id;
    this.service.excluir(pessoa.id)
      .pipe(finalize(() => (this.excluindoId = null)))
      .subscribe({
        next: () => {
          this.mudou = true;
          this.pessoas = this.pessoas.filter(p => p.id !== pessoa.id);
        },
        error: e => this.alert.error(extrairMensagemErro(e, 'Não foi possível excluir a pessoa.'))
      });
  }

  private carregar(): void {
    this.loading = true;
    this.service.listar()
      .pipe(finalize(() => (this.loading = false)))
      .subscribe({
        next: lista => {
          this.titular = lista.find(p => p.ehTitular) ?? null;
          this.pessoas = lista.filter(p => !p.ehTitular).sort((a, b) => a.nomePessoa.localeCompare(b.nomePessoa, 'pt-BR'));
        },
        error: e => this.alert.error(extrairMensagemErro(e, 'Erro ao carregar as pessoas.'))
      });
  }
}
