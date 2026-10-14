import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { CategoryService } from 'src/app/core/services/category.service';
import { ContaMensalService } from 'src/app/core/services/conta-mensal.service';
import { formatDateVencimento } from 'src/app/core/utils/mask';
import { CategoriaDto } from 'src/app/core/models/categoria.model';
import { finalize } from 'rxjs';
import { extrairMensagemErro } from 'src/app/core/utils/http-error';

@Component({
  selector: 'app-modal-nova-contas-a-pagar',
  templateUrl: './modal-nova-contas-a-pagar.component.html',
  styleUrls: ['./modal-nova-contas-a-pagar.component.scss']
})
export class ModalNovaContasAPagarComponent implements OnInit {
  @Output() closed = new EventEmitter<boolean>();
  @Input() dataOperacao = null as any;

  saving = false;
  categorias: CategoriaDto[] = [];


  form = this.fb.group({
    nomeConta: ['', [Validators.required, Validators.minLength(2)]],
    valor: [null as number | null, [Validators.required]], // número direto do currencyInput (FE-P2-10)
    dataOperacao: [null as any, [Validators.required]],
    categoryid: [null as any, [Validators.required]],
  });

  constructor(private fb: FormBuilder, private contaMensalService: ContaMensalService, private categoryService: CategoryService) {}

  ngOnInit() {
    this.categoryService.listarAtivas().subscribe(categorias => (this.categorias = categorias));
  }

  

  close(reload = false) {
    this.closed.emit(reload);
  }

  save() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const payload = {
      date: formatDateVencimento(this.dataOperacao, this.form.value.dataOperacao!),
      name: this.form.value.nomeConta!,
      categoryid: Number(this.form.value.categoryid),
      value: this.form.value.valor,
      status: 'PENDENTE',
    };

    this.saving = true;
    this.contaMensalService.criar(payload)
      .pipe(finalize(() => (this.saving = false)))
      .subscribe({
        next: () => this.close(true),
        error: e => alert(extrairMensagemErro(e, 'Erro ao salvar conta.'))
      });
  }
}
