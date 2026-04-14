import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { AccountDto, ContaService } from 'src/app/core/services/contas.service';
import { Category } from 'src/app/core/services/category.service';
import { formatMoneyBRFromAny, parseMoneyBRToNumber } from 'src/app/core/utils/mask';

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
    value: [null as any, [Validators.required]],
    dataOperacao: [null as any, [Validators.required]],
    categoryid: [null as any, [Validators.required, Validators.min(1), Validators.max(31)]],
    status: [1, Validators.required],
    ehParcelado: [false],
    parcelaAtual: [1],
    quantidadeParcelas: [1]
  });

  constructor(private fb: FormBuilder, private contaService: ContaService) {}

  ngOnInit(): void {
    if (this.account) {
      console.log(this.account);
      this.form.patchValue({
        name: this.account.name,
        value: this.formataDecimal(this.account.value),
        dataOperacao: this.account.dataOperacao,
        categoryid: this.account.categoryid,
        status: this.account.status,
        ehParcelado: this.account.ehParcelado,
        parcelaAtual: this.account.parcelaAtual,
        quantidadeParcelas: this.account.quantidadeParcelas
      });
    }
  }

  formataDecimal(value: number) {
    var valor = value
    var valorFixed = valor.toFixed(2)
    var valorconvertido = valorFixed.toString().replace('.', ',')
    
    console.log('contem .', valorconvertido)
    
    return valorconvertido
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

      const payload = {
        id: this.account?.id,
        name: this.form.value.name!,
        value: parseMoneyBRToNumber(this.form.value.value),
        categoryid: Number(this.form.value.categoryid),
        status: Number(this.form.value.status),
        ehParcelado: Boolean(this.form.value.ehParcelado),
        parcelaAtual: Number(this.form.value.parcelaAtual),
        quantidadeParcelas: Number(this.form.value.quantidadeParcelas),
        dataOperacao: Number(this.form.value.dataOperacao!),
      };

      if (this.account) {
        await this.contaService.update(payload);
      } else {
        await this.contaService.create(payload);
      }

      this.close(true);
    } catch {
      alert('Erro ao salvar conta.');
    } finally {
      this.saving = false;
    }
  }
}
