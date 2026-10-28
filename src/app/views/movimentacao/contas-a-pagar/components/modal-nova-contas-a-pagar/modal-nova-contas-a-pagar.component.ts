import { Component, EventEmitter, Input, OnInit, Output, inject } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { CategoryService } from 'src/app/core/services/category.service';
import { ContaMensalService } from 'src/app/core/services/conta-mensal.service';
import { formatDateVencimento } from 'src/app/core/utils/mask';
import { CategoriaDto } from 'src/app/core/models/categoria.model';
import { finalize } from 'rxjs';
import { extrairMensagemErro } from 'src/app/core/utils/http-error';
import { diasVencimentoValidator, lerDiasVencimento } from 'src/app/core/utils/dias-vencimento';
import { SharedModule } from 'src/app/shared/shared.module';
import { AlertService } from 'src/app/shared/components/alert.service';
import { iconeDe } from 'src/app/shared/ui/aparencia';
import { CategoryIconComponent } from 'src/app/shared/ui/category-icon/category-icon.component';

/** Nova conta em Contas a Pagar, no painel e nas seções do Cadastro de Contas (card #49). */
@Component({
  selector: 'app-modal-nova-contas-a-pagar',
  standalone: true,
  imports: [SharedModule, CategoryIconComponent],
  templateUrl: './modal-nova-contas-a-pagar.component.html'
})
export class ModalNovaContasAPagarComponent implements OnInit {
  @Output() closed = new EventEmitter<boolean>();
  /** Mês aberto em Contas a Pagar: a conta nova vence nele. */
  @Input({ required: true }) dataOperacao!: Date;

  saving = false;
  categorias: CategoriaDto[] = [];
  /** Formulário válido, esperando a resposta de "Cadastrar também em Contas?" (card #47). */
  perguntandoCadastro = false;
  /** O Salvar que abriu a pergunta foi o "Salvar e criar outra": depois de gravar, limpa e continua aberto. */
  private criandoOutra = false;
  /** Alguma conta já foi gravada pelo "Salvar e criar outra": ao fechar, o mês recarrega. */
  private gravouAlguma = false;
  readonly iconeDe = iconeDe;
  private readonly alertService = inject(AlertService);


  form = this.fb.group({
    nomeConta: ['', [Validators.required, Validators.minLength(2)]],
    valor: [null as number | null, [Validators.required]], // número direto do currencyInput (FE-P2-10)
    // "5, 20": um ou mais dias, como no Cadastro de Contas — a API cria a conta com todos eles.
    dataOperacao: [null as string | null, [Validators.required, diasVencimentoValidator]],
    categoryId: [null as number | null, [Validators.required]],
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
    this.closed.emit(reload || this.gravouAlguma);
  }

  /** Salvar: com o formulário válido, pergunta antes se a conta entra também no Cadastro de Contas (card #47). */
  save(criarOutra = false) {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.criandoOutra = criarOutra;
    this.perguntandoCadastro = true;
  }

  salvarEOutra() {
    this.save(true);
  }

  /** Resposta da pergunta: true = cria a conta junto (como antes); false = lançamento avulso só neste mês. */
  gravar(cadastrarConta: boolean) {
    this.perguntandoCadastro = false;
    // Válido pelo diasVencimentoValidator. A data leva o mês e o primeiro dia; a API lança uma transação por dia.
    const dias = lerDiasVencimento(this.form.value.dataOperacao)!;
    const payload = {
      data: formatDateVencimento(this.dataOperacao, dias[0]),
      diasVencimento: dias,
      nome: this.form.value.nomeConta!,
      categoriaId: Number(this.form.value.categoryId),
      valor: this.form.value.valor!,
      situacao: 'PENDENTE',
      cadastrarConta,
    };

    this.saving = true;
    this.contaMensalService.criar(payload)
      .pipe(finalize(() => (this.saving = false)))
      .subscribe({
        next: () => {
          this.alertService.success('Conta salva com sucesso!');
          if (!this.criandoOutra) return this.close(true);
          this.gravouAlguma = true;
          this.form.reset();
        },
        error: e => alert(extrairMensagemErro(e, 'Erro ao salvar conta.'))
      });
  }
}
