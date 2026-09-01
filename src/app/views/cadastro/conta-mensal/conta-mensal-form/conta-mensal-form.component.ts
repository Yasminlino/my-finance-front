import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { AccountDto, ContaService } from 'src/app/core/services/contas.service';
import { Category } from 'src/app/core/services/category.service';
import { formataDecimal, parseMoneyBRToNumber } from 'src/app/core/utils/mask';
import { AlertService } from 'src/app/shared/components/alert.service'; // <-- Importe o AlertService

@Component({
  selector: 'app-conta-mensal-form',
  templateUrl: './conta-mensal-form.component.html',
  styleUrls: ['./conta-mensal-form.component.scss']
})
export class ContaMensalFormComponent implements OnInit {
  @Input() account: AccountDto | null = null;
  @Input() categories: Category[] = [];
  @Output() closed = new EventEmitter<boolean>(); // true => recarregar lista
  contaParcelada = false;
  parcelaAtual = 2;
  quantidadeParcelas = 2;

  saving = false;

  form = this.fb.group({
    name: ['', [Validators.required, Validators.minLength(2)]],
    value: [formataDecimal(0), [Validators.required]],
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
    if (this.account) {
      const dias = this.account.contaVencimentos
        ?.map(v => v.dia)
        .sort((a, b) => a - b)
        .join(',');

      this.form.patchValue({
        name: this.account.name,
        value: formataDecimal(this.account.value),
        dataOperacao: dias, 
        categoryid: this.account.categoryid,
        status: this.account.status,
        ehParcelado: this.account.ehParcelado,
        parcelaAtual: this.account.parcelaAtual,
        quantidadeParcelas: this.account.quantidadeParcelas
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

  close(reload = false) {
    this.closed.emit(reload);
  }

  async save() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    try {
      this.saving = true;

      var diasVencimento = String(this.form.value.dataOperacao).split(",").map(d => Number(d))

      const payload: Partial<AccountDto> = {
        id: this.account?.id,
        name: this.form.value.name!,
        value: parseMoneyBRToNumber(this.form.value.value!) ?? 0,
        categoryid: Number(this.form.value.categoryid),
        status: Number(this.form.value.status),
        ehParcelado: Boolean(this.form.value.ehParcelado),
        parcelaAtual: Number(this.form.value.parcelaAtual),
        quantidadeParcelas: Number(this.form.value.quantidadeParcelas),
        dataOperacao: diasVencimento,
      };

      if (this.account) {
        await this.contaService.update(payload);
      } else {
        await this.contaService.create(payload);
      }

      this.alertService.success('Conta salva com sucesso!');      
      setTimeout(() => {
        this.close(true);
      }, 300);

    } catch {
      this.alertService.error('Erro ao salvar conta.');
    } finally {
      this.saving = false;
    }
  }
}