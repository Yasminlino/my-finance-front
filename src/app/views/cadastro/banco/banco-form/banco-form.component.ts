import { CommonModule } from '@angular/common';
import { CurrencyInputDirective } from 'src/app/shared/directives/currency-input.directive';
import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { FormBuilder, Validators, ReactiveFormsModule } from '@angular/forms';
import { BancoService } from 'src/app/core/services/banco.service';
import { AlertService } from 'src/app/shared/components/alert.service';
import { extrairMensagemErro } from 'src/app/core/utils/http-error';
import { BancoDto } from 'src/app/core/models/banco.model';
import { TipoCartaoDto } from 'src/app/core/models/tipo-cartao.model';
import { finalize } from 'rxjs';
import { FormPanelComponent } from 'src/app/shared/ui/form-panel/form-panel.component';
import { FieldErrorComponent } from 'src/app/shared/ui/field-error/field-error.component';
import { DropdownModule } from 'primeng/dropdown';
import { InputSwitchModule } from 'primeng/inputswitch';
import { MultiSelectModule } from 'primeng/multiselect';
import { PessoaMovimentacaoService } from 'src/app/core/services/pessoa-movimentacao.service';
import { InputTextModule } from 'primeng/inputtext';
import { ButtonModule } from 'primeng/button';
import { OPCOES_ATIVO } from 'src/app/shared/utils/opcoes-status';

@Component({
  selector: 'app-banco-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, CurrencyInputDirective, FormPanelComponent, FieldErrorComponent, DropdownModule, InputSwitchModule, MultiSelectModule, InputTextModule, ButtonModule],
  templateUrl: './banco-form.component.html'
})
export class BancoFormComponent implements OnInit {
  /** Registro em edição; null = novo (mesmo nome nos 5 cadastros, FE-P2-12). */
  @Input() registro: BancoDto | null = null;
  @Input() tiposCartao: TipoCartaoDto[] = [];
  @Output() closed = new EventEmitter<boolean>();

  saving = false;
  /** Quem pode usar o cartão: pessoas que entram nos acertos, sem o "Eu" (card #77). */
  opcoesPessoas: { label: string; value: number }[] = [];
  tentouSalvar = false;
  readonly opcoesStatus = OPCOES_ATIVO;

  form = this.fb.group({
    nomeBanco: ['', [Validators.required, Validators.minLength(2)]],
    agencia: ['', [Validators.maxLength(10)]],
    numeroConta: ['', [Validators.maxLength(20)]],
    // Número direto do currencyInput (FE-P2-10).
    saldoInicial: [0 as number | null, [Validators.required]],
    diaVencimento: [null as number | null, [Validators.min(1), Validators.max(31)]],
    diaFechamento: [null as number | null, [Validators.min(1), Validators.max(31)]],
    compartilhado: [false],
    pessoasIds: [[] as number[]],
    ativo: [true, [Validators.required]],
    tipoCartaoId: [null as number | null, [Validators.required]],
  });

  constructor(
    private fb: FormBuilder,
    private bancoService: BancoService,
    private readonly alertService: AlertService,
    private readonly pessoaService: PessoaMovimentacaoService
  ) {}

  /** Fechamento e pessoas só fazem sentido em cartão de crédito. */
  get ehCredito(): boolean {
    return this.tiposCartao.find(t => t.id === Number(this.form.controls.tipoCartaoId.value))?.ehCredito === true;
  }

  get faltaPessoa(): boolean {
    return this.tentouSalvar && this.ehCredito && !!this.form.value.compartilhado && !this.form.value.pessoasIds?.length;
  }

  ngOnInit(): void {
    this.pessoaService.listar().subscribe({
      next: pessoas => {
        this.opcoesPessoas = pessoas
          .filter(p => p.entraNosAcertos && !p.ehTitular)
          .map(p => ({ label: p.nomePessoa, value: p.id }))
          .sort((a, b) => a.label.localeCompare(b.label, 'pt-BR'));
      },
      error: () => (this.opcoesPessoas = [])
    });
    if (this.registro) {
      this.form.patchValue({
        nomeBanco: this.registro.nomeBanco,
        agencia: this.registro.agencia ?? '',
        numeroConta: this.registro.numeroConta ?? '',
        saldoInicial: this.registro.saldoInicial,
        diaVencimento: this.registro.diaVencimento ?? null,
        diaFechamento: this.registro.diaFechamento ?? null,
        compartilhado: !!this.registro.compartilhado,
        pessoasIds: this.registro.pessoasIds ?? [],
        ativo: this.registro.ativo,
        tipoCartaoId: this.registro.tipoCartaoId ?? null,
      });
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
    this.tentouSalvar = true;
    if (this.form.invalid || this.faltaPessoa) {
      this.form.markAllAsTouched();
      return;
    }
    const credito = this.ehCredito;

    const payload = {
      id: this.registro?.id || 0,
      nomeBanco: this.form.value.nomeBanco!,
      agencia: this.form.value.agencia?.trim() || null,
      numeroConta: this.form.value.numeroConta?.trim() || null,
      saldoInicial: this.form.value.saldoInicial ?? 0,
      diaVencimento: this.form.value.diaVencimento || null,
      // Mandados sempre: o PUT grava o cadastro inteiro, e faltar um campo apagaria o valor (card #77).
      diaFechamento: credito ? this.form.value.diaFechamento || null : null,
      compartilhado: credito && !!this.form.value.compartilhado,
      pessoasIds: credito ? this.form.value.pessoasIds ?? [] : [],
      conviteCompartilharDispensado: !!this.registro?.conviteCompartilharDispensado,
      tipoCartaoId: Number(this.form.value.tipoCartaoId),
      ativo: !!this.form.value.ativo,
    };

    this.saving = true;
    (this.registro ? this.bancoService.atualizar(payload) : this.bancoService.criar(payload))
      .pipe(finalize(() => (this.saving = false)))
      .subscribe({
        next: () => {
          this.alertService.success(`Banco "${payload.nomeBanco}" salvo com sucesso!`);
          this.close(true);
        },
        error: e => this.alertService.error(extrairMensagemErro(e, `Erro ao salvar Banco "${payload.nomeBanco}".`))
      });
  }
}
