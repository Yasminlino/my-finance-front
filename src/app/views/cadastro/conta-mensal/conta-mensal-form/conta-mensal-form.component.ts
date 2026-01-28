import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { AccountDto, ContaService } from 'src/app/core/services/contas.service';
import { Category } from 'src/app/core/services/category.service';

@Component({
  selector: 'app-conta-mensal-form',
  templateUrl: './conta-mensal-form.component.html',
  styleUrls: ['./conta-mensal-form.component.scss']
})
export class ContaMensalFormComponent implements OnInit {
  @Input() account: AccountDto | null = null;
  @Input() categories: Category[] = [];
  @Output() closed = new EventEmitter<boolean>(); // true => recarregar lista

  saving = false;

  form = this.fb.group({
    name: ['', [Validators.required, Validators.minLength(2)]],
    value: [null as number | null, [Validators.required]],
    dataOperacao: [null as any, [Validators.required]],
    categoryid: [null as any, [Validators.required, Validators.min(1), Validators.max(31)]],
  });

  constructor(private fb: FormBuilder, private contaService: ContaService) {}

  ngOnInit(): void {
    if (this.account) {
      this.form.patchValue({
        name: this.account.name,
        value: this.account.value,
        dataOperacao: this.account.dataOperacao,
        categoryid: this.account.categoryid,
      });
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

      const payload = {
        id: this.account?.id,
        name: this.form.value.name!,
        value: Number(this.form.value.value) * 100 || 0,
        categoryid: Number(this.form.value.categoryid),
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
