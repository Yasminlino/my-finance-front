import { CommonModule } from '@angular/common';
import { CurrencyInputDirective } from 'src/app/shared/directives/currency-input.directive';
import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { FormBuilder, Validators, ReactiveFormsModule } from '@angular/forms';
import { ContaService } from 'src/app/core/services/contas.service';
import { AlertService } from 'src/app/shared/components/alert.service'; // <-- Importe o AlertService
import { CategoriaDto } from 'src/app/core/models/categoria.model';
import { ContaDto } from 'src/app/core/models/conta.model';
import { finalize } from 'rxjs';
import { extrairMensagemErro } from 'src/app/core/utils/http-error';
import { DialogModule } from 'primeng/dialog';
import { DropdownModule } from 'primeng/dropdown';
import { InputTextModule } from 'primeng/inputtext';
import { CheckboxModule } from 'primeng/checkbox';
import { ButtonModule } from 'primeng/button';
import { OPCOES_STATUS_NUMERICO } from 'src/app/shared/utils/opcoes-status';

@Component({
  selector: 'app-conta-mensal-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, CurrencyInputDirective, DialogModule, DropdownModule, InputTextModule, CheckboxModule, ButtonModule],
  templateUrl: './conta-mensal-form.component.html'
})
export class ContaMensalFormComponent implements OnInit {
  /** Registro em edição; null = novo (mesmo nome nos 5 cadastros, FE-P2-12). */
  @Input() registro: ContaDto | null = null;
  @Input() categories: CategoriaDto[] = [];
  @Output() closed = new EventEmitter<boolean>(); // true => recarregar lista
  contaParcelada = false;
  parcelaAtual = 2;
  quantidadeParcelas = 2;

  saving = false;
  readonly opcoesStatus = OPCOES_STATUS_NUMERICO;

  form = this.fb.group({
    name: ['', [Validators.required, Validators.minLength(2)]],
    // Número direto do currencyInput (FE-P2-10).
    value: [0 as number | null, [Validators.required]],
    dataOperacao: [null as any, [Validators.required]],
    categoryid: [null as any, [Validators.required, Validators.min(1)]],
    status: [1, Validators.required],
    ehParcelado: [false],
    parcelaAtual: [1],
    quantidadeParcelas: [1]
  });

  // Injete o AlertService no construtor
  constructor(
    private fb: FormBuilder, 
    private contaService: ContaService,
    private alertService: AlertService 
  ) { }

  ngOnInit(): void {
    if (this.registro) {
      const dias = this.registro.contaVencimentos
        ?.map(v => v.dia)
        .sort((a, b) => a - b)
        .join(',');

      this.form.patchValue({
        name: this.registro.name,
        value: this.registro.value,
        dataOperacao: dias, 
        categoryid: this.registro.categoryid,
        status: this.registro.status,
        ehParcelado: this.registro.ehParcelado,
        parcelaAtual: this.registro.parcelaAtual,
        quantidadeParcelas: this.registro.quantidadeParcelas
      });
    }
  }

  onInputChange(valor: string) {
    var a = valor.replace(/[^0-9,]/g, '');
    this.form.patchValue({ dataOperacao: a });

    if (valor.includes(',')) {
      const dias = valor
        .split(',')
        .map(d => parseInt(d.trim(), 10))
        .filter(d => !isNaN(d) && d >= 1);

      var diasValidos = "";

      for (let i = 0; i < dias.length; i++) {
        if (dias.indexOf(dias[i]) !== i) {
          alert('Já foi incluído o valor.');
        } else if (dias[i] > 31) {
          alert('Valor não pode ser maior que 31.');
        } else {
          if (dias.length == 1 && valor.includes(',') || i == dias.length - 1 && valor[valor.length - 1] == "," || i < dias.length - 1)
            diasValidos += dias[i] + ","
          else
            diasValidos += dias[i]
        }
      }
      this.form.patchValue({ dataOperacao: diasValidos });
    }
    else if (parseInt(valor) > 31) {
      alert('Valor não pode ser maior que 31');
      this.form.patchValue({ dataOperacao: "" });
    }
  }

  onDiasChange(valor: string) {
    var a = valor.replace(/[^0-9,]/g, '');
    if (a[a.length - 1] == ",") {
      a = a.slice(0, -1);
      this.form.patchValue({ dataOperacao: a });
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

    const diasVencimento = String(this.form.value.dataOperacao).split(",").map(d => Number(d));

    const payload: Partial<ContaDto> = {
      id: this.registro?.id,
      name: this.form.value.name!,
      value: this.form.value.value ?? 0,
      categoryid: Number(this.form.value.categoryid),
      status: Number(this.form.value.status),
      ehParcelado: Boolean(this.form.value.ehParcelado),
      parcelaAtual: Number(this.form.value.parcelaAtual),
      quantidadeParcelas: Number(this.form.value.quantidadeParcelas),
      dataOperacao: diasVencimento,
    };

    this.saving = true;
    (this.registro ? this.contaService.atualizar(payload) : this.contaService.criar(payload))
      .pipe(finalize(() => (this.saving = false)))
      .subscribe({
        next: () => {
          this.alertService.success('Conta salva com sucesso!');
          this.close(true);
        },
        error: e => this.alertService.error(extrairMensagemErro(e, 'Erro ao salvar conta.'))
      });
  }
}