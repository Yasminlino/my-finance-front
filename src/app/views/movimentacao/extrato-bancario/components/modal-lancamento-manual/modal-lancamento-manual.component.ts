import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AbstractControl, FormBuilder, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { NgbTypeaheadModule } from '@ng-bootstrap/ng-bootstrap';
import { Observable, concat, debounceTime, distinctUntilChanged, finalize, map, toArray } from 'rxjs';

import { ExtratoBancarioItemService } from 'src/app/core/services/extrato-bancario-item.service';
import { AlertService } from 'src/app/shared/components/alert.service';
import { CurrencyInputDirective } from 'src/app/shared/directives/currency-input.directive';
import { extrairMensagemErro } from 'src/app/core/utils/http-error';
import { BancoDto } from 'src/app/core/models/banco.model';
import { CategoriaDto } from 'src/app/core/models/categoria.model';
import { PessoaMovimentacaoDto } from 'src/app/core/models/pessoa-movimentacao.model';
import { TipoCartaoDto } from 'src/app/core/models/tipo-cartao.model';
import { TipoMovimentacaoDto } from 'src/app/core/models/tipo-movimentacao.model';
import { LancamentoManualValores, montarLancamentosManuais } from 'src/app/core/models/lancamento-manual';

/** A parcela atual não pode passar do total (só vale quando a compra é parcelada). */
function parcelaDentroDoTotal(grupo: AbstractControl): ValidationErrors | null {
  const { parcelado, quantidadeParcelas, parcelaAtual } = grupo.value;
  return parcelado && Number(parcelaAtual) > Number(quantidadeParcelas) ? { parcelaForaDoTotal: true } : null;
}

/**
 * Lançamento manual do Extrato, usado pelo Resumo (banco escolhido) e pelo Detalhes (banco fixo).
 * Substitui os dois modais que tinham divergido — o do Resumo não mandava a fatura e registrava
 * só uma parcela (FE-P2-10). Emite `fechado(true)` quando gravou, para a tela recarregar.
 */
@Component({
  selector: 'app-modal-lancamento-manual',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, NgbTypeaheadModule, CurrencyInputDirective],
  templateUrl: './modal-lancamento-manual.component.html'
})
export class ModalLancamentoManualComponent implements OnInit {
  /** Mês da tela ("YYYY-MM"): data padrão e fatura sugerida. */
  @Input({ required: true }) mes!: string;
  @Input() bancos: BancoDto[] = [];
  /** Banco da tela (Detalhes); sem ele, o banco é escolhido no formulário (Resumo). */
  @Input() bancoFixoId?: number | null;
  @Input() tiposCartao: TipoCartaoDto[] = [];
  @Input() categorias: CategoriaDto[] = [];
  @Input() tiposMovimentacao: TipoMovimentacaoDto[] = [];
  @Input() pessoas: PessoaMovimentacaoDto[] = [];
  @Output() fechado = new EventEmitter<boolean>();

  salvando = false;

  readonly form = this.fb.group({
    dataMovimentacao: ['', Validators.required],
    tipoLancamento: ['Saída'],
    valor: [null as number | null, [Validators.required, Validators.min(0.01)]],
    bancoId: [null as number | null, Validators.required],
    categoriaId: [null as number | null],
    pessoa: [null as PessoaMovimentacaoDto | string | null],
    descricao: [''],
    observacao: [''],
    numeroFatura: ['', Validators.pattern(/^\d{4}-\d{2}$/)],
    parcelado: [false],
    quantidadeParcelas: [2, Validators.min(2)],
    parcelaAtual: [1, Validators.min(1)],
    gerarTodasParcelas: [true]
  }, { validators: parcelaDentroDoTotal });

  constructor(
    private readonly fb: FormBuilder,
    private readonly itemService: ExtratoBancarioItemService,
    private readonly alertService: AlertService
  ) {}

  ngOnInit(): void {
    this.form.patchValue({ dataMovimentacao: `${this.mes}-01`, numeroFatura: this.mes });
    if (this.bancoFixoId) {
      this.form.controls.bancoId.setValue(this.bancoFixoId);
      this.form.controls.bancoId.disable();
    }
  }

  get tipoCartao(): TipoCartaoDto | undefined {
    const bancoId = Number(this.form.controls.bancoId.value);
    const banco = this.bancos.find(b => b.id === bancoId);
    const tipoCartaoId = banco?.tipoCartaoId ?? banco?.tipoCartao?.id;
    return this.tiposCartao.find(t => t.id === tipoCartaoId);
  }

  /** Cartão de crédito: lançamento vai por fatura e pode ser parcelado. */
  get ehCredito(): boolean {
    return this.tipoCartao?.ehCredito === true;
  }

  /** Erro a mostrar no campo: só depois de tocar nele (ou de tentar salvar). */
  invalido(campo: keyof typeof this.form.controls): boolean {
    const controle = this.form.controls[campo];
    return controle.invalid && (controle.touched || controle.dirty);
  }

  get parcelaForaDoTotal(): boolean {
    return this.form.hasError('parcelaForaDoTotal') && this.form.controls.parcelaAtual.touched;
  }

  buscarPessoa = (texto$: Observable<string>) =>
    texto$.pipe(
      debounceTime(150),
      distinctUntilChanged(),
      map(termo => {
        const t = (termo ?? '').trim().toLowerCase();
        const lista = t ? this.pessoas.filter(p => (p.nomePessoa ?? '').toLowerCase().includes(t)) : this.pessoas;
        return lista.slice(0, 10);
      })
    );

  nomePessoa = (pessoa: PessoaMovimentacaoDto | string | null) =>
    typeof pessoa === 'string' ? pessoa : pessoa?.nomePessoa ?? '';

  cancelar(): void {
    if (!this.salvando) this.fechado.emit(false);
  }

  salvar(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const valores = this.form.getRawValue() as unknown as LancamentoManualValores;
    const itens = montarLancamentosManuais(valores, {
      categorias: this.categorias,
      tiposMovimentacao: this.tiposMovimentacao,
      bancoId: Number(this.form.controls.bancoId.value),
      tipoCartaoId: this.tipoCartao?.id ?? null,
      ehCredito: this.ehCredito
    });

    this.salvando = true;
    // Uma por vez, na ordem; para no primeiro erro.
    concat(...itens.map(item => this.itemService.criar(item)))
      .pipe(toArray(), finalize(() => (this.salvando = false)))
      .subscribe({
        next: () => {
          this.alertService.success(this.mensagemDeSucesso(itens.length, valores));
          this.fechado.emit(true);
        },
        error: e => this.alertService.error(extrairMensagemErro(e, 'Erro ao adicionar lançamento.'))
      });
  }

  private mensagemDeSucesso(quantidade: number, valores: LancamentoManualValores): string {
    if (!this.ehCredito || !valores.parcelado) return 'Lançamento adicionado com sucesso!';
    return valores.gerarTodasParcelas
      ? `Parcelamento criado: ${quantidade} parcelas.`
      : `Compra parcelada registrada (${valores.parcelaAtual}/${valores.quantidadeParcelas}).`;
  }
}
