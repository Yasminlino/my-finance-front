import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { CategoryService, Category } from 'src/app/core/services/category.service';
import { ContaMensalService } from 'src/app/core/services/conta-mensal.service';
import { formatDateVencimento } from 'src/app/core/utils/mask';
import { parseMoneyBRToNumber } from 'src/app/core/utils/mask';

@Component({
  selector: 'app-modal-nova-conta-mensal',
  templateUrl: './modal-nova-conta-mensal.component.html',
  styleUrls: ['./modal-nova-conta-mensal.component.scss']
})
export class ModalNovaContaMensalComponent implements OnInit {
  @Output() closed = new EventEmitter<boolean>();
  @Input() dataOperacao = null as any;

  saving = false;
  categorias: Category[] = [];


  form = this.fb.group({
    nomeConta: ['', [Validators.required, Validators.minLength(2)]],
    valor: [null as any, [Validators.required]],
    dataOperacao: [null as any, [Validators.required]],
    categoryid: [null as any, [Validators.required, Validators.min(1), Validators.max(31)]],
  });

  constructor(private fb: FormBuilder, private contaMensalService: ContaMensalService, private categoryService: CategoryService) {}

  async ngOnInit() {
    this.categorias = await this.categoryService.list();
  }

  

  close(reload = false) {
    this.closed.emit(reload);
  }

  async save() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    console.log(this.form.value);
    
    try {
      this.saving = true;
      const payload = {
        date: formatDateVencimento(this.dataOperacao, this.form.value.dataOperacao!),
        name: this.form.value.nomeConta!,
        categoryid: Number(this.form.value.categoryid),
        value: parseMoneyBRToNumber(this.form.value.valor),
        status: 'PENDENTE',
      };
      
      await this.contaMensalService.createContaMensal(payload);
      
      this.close(true);
    } catch {
      alert('Erro ao salvar conta.');
    } finally {
      this.saving = false;
    }
  }
}
