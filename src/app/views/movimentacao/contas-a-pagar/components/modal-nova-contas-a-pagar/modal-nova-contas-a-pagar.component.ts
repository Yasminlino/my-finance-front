import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { CategoryService } from 'src/app/core/services/category.service';
import { ContaMensalService } from 'src/app/core/services/conta-mensal.service';
import { formatDateVencimento } from 'src/app/core/utils/mask';
import { CategoriaDto } from 'src/app/core/models/categoria.model';
import { finalize } from 'rxjs';
import { extrairMensagemErro } from 'src/app/core/utils/http-error';
import { diasVencimentoValidator, lerDiasVencimento } from 'src/app/core/utils/dias-vencimento';

@Component({
  selector: 'app-modal-nova-contas-a-pagar',
  templateUrl: './modal-nova-contas-a-pagar.component.html'
})
export class ModalNovaContasAPagarComponent implements OnInit {
  @Output() closed = new EventEmitter<boolean>();
  @Input() dataOperacao = null as any;

  saving = false;
  categorias: CategoriaDto[] = [];


  form = this.fb.group({
    nomeConta: ['', [Validators.required, Validators.minLength(2)]],
    valor: [null as number | null, [Validators.required]], // número direto do currencyInput (FE-P2-10)
    // "5, 20": um ou mais dias, como no Cadastro de Contas — a API cria a conta com todos eles.
    dataOperacao: [null as any, [Validators.required, diasVencimentoValidator]],
    categoryId: [null as any, [Validators.required]],
  });

  constructor(private fb: FormBuilder, private contaMensalService: ContaMensalService, private categoryService: CategoryService) {}

  ngOnInit() {
    this.categoryService.listarAtivas().subscribe(categorias => (this.categorias = categorias));
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

    // Válido pelo diasVencimentoValidator. A data leva o mês e o primeiro dia; a API lança uma transação por dia.
    const dias = lerDiasVencimento(this.form.value.dataOperacao)!;
    const payload = {
      data: formatDateVencimento(this.dataOperacao, dias[0]),
      diasVencimento: dias,
      nome: this.form.value.nomeConta!,
      categoriaId: Number(this.form.value.categoryId),
      valor: this.form.value.valor,
      situacao: 'PENDENTE',
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
