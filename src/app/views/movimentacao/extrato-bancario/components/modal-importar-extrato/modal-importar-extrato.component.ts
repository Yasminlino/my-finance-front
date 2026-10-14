import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { finalize } from 'rxjs';

import { ExtratoBancarioItemService } from 'src/app/core/services/extrato-bancario-item.service';
import { AlertService } from 'src/app/shared/components/alert.service';
import { extrairMensagemErro } from 'src/app/core/utils/http-error';
import { BancoDto } from 'src/app/core/models/banco.model';
import { TipoCartaoDto } from 'src/app/core/models/tipo-cartao.model';

/** O que a API devolve da importação: criados / já importados / ignorados (reimportar não cria nada). */
type ResultadoImportacao = { quantidadeCriados?: number; mensagem?: string } | null;

/**
 * Importação de extrato do Resumo, em formulário Reactive (FE-P2-10). Antes o banco e o arquivo
 * ficavam em campos soltos da tela, e o arquivo sobrevivia entre aberturas do modal.
 * Emite `fechado(true)` quando importou, para a tela recarregar.
 */
@Component({
  selector: 'app-modal-importar-extrato',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './modal-importar-extrato.component.html'
})
export class ModalImportarExtratoComponent {
  @Input() bancos: BancoDto[] = [];
  @Input() tiposCartao: TipoCartaoDto[] = [];
  @Output() fechado = new EventEmitter<boolean>();

  importando = false;

  readonly form = this.fb.group({
    bancoId: [null as number | null, Validators.required],
    arquivo: [null as File | null, Validators.required]
  });

  constructor(
    private readonly fb: FormBuilder,
    private readonly itemService: ExtratoBancarioItemService,
    private readonly alertService: AlertService
  ) {}

  get banco(): BancoDto | undefined {
    return this.bancos.find(b => b.id === Number(this.form.controls.bancoId.value));
  }

  get tipoCartao(): TipoCartaoDto | undefined {
    const tipoCartaoId = this.banco?.tipoCartaoId ?? this.banco?.tipoCartao?.id;
    return this.tiposCartao.find(t => t.id === tipoCartaoId);
  }

  invalido(campo: keyof typeof this.form.controls): boolean {
    const controle = this.form.controls[campo];
    return controle.invalid && controle.touched;
  }

  /** O input de arquivo não tem ControlValueAccessor: o arquivo escolhido vai para o controle aqui. */
  onArquivo(evento: Event): void {
    const arquivo = (evento.target as HTMLInputElement).files?.[0] ?? null;
    this.form.controls.arquivo.setValue(arquivo);
    this.form.controls.arquivo.markAsTouched();
  }

  cancelar(): void {
    if (!this.importando) this.fechado.emit(false);
  }

  salvar(): void {
    const banco = this.banco;
    const arquivo = this.form.controls.arquivo.value;
    if (this.form.invalid || !banco || !arquivo) {
      this.form.markAllAsTouched();
      return;
    }

    this.importando = true;
    this.itemService.importar(arquivo, { id: banco.id, nomeBanco: banco.nomeBanco, tipoCartaoId: this.tipoCartao?.id ?? null })
      .pipe(finalize(() => (this.importando = false)))
      .subscribe({
        next: resposta => {
          const resultado = resposta as ResultadoImportacao;
          const mensagem = resultado?.mensagem ?? 'Extrato importado com sucesso!';
          if ((resultado?.quantidadeCriados ?? 1) > 0) this.alertService.success(mensagem);
          else this.alertService.info(mensagem);
          this.fechado.emit(true);
        },
        error: e => this.alertService.error(extrairMensagemErro(e, 'Falha ao importar arquivo.'))
      });
  }
}
