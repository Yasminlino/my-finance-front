import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { FormBuilder, Validators, ReactiveFormsModule } from '@angular/forms';
import { CategoryService } from 'src/app/core/services/category.service';
import { AlertService } from 'src/app/shared/components/alert.service';
import { extrairMensagemErro } from 'src/app/core/utils/http-error';
import { CategoriaDto } from 'src/app/core/models/categoria.model';
import { finalize } from 'rxjs';
import { DialogModule } from 'primeng/dialog';
import { DropdownModule } from 'primeng/dropdown';
import { InputTextModule } from 'primeng/inputtext';
import { ButtonModule } from 'primeng/button';
import { OPCOES_STATUS_NUMERICO } from 'src/app/shared/utils/opcoes-status';

@Component({
  selector: 'app-categoria-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, DialogModule, DropdownModule, InputTextModule, ButtonModule],
  templateUrl: './categoria-form.component.html'
})
export class CategoriaFormComponent implements OnInit {
  /** Registro em edição; null = novo (mesmo nome nos 5 cadastros, FE-P2-12). */
  @Input() registro: CategoriaDto | null = null;
  @Output() closed = new EventEmitter<boolean>();

  saving = false;
  readonly opcoesStatus = OPCOES_STATUS_NUMERICO;

  readonly opcoesTipo = [
    { label: 'Receita', value: 'Receita' },
    { label: 'Despesa', value: 'Despesa' },
  ];

  /** Natureza do gasto: pessoa física (1-3) ou empresa (4-5). */
  get opcoesNatureza() {
    return this.perfilEmpresa
      ? [{ label: 'Pessoal', value: 4 }, { label: 'Empresa', value: 5 }]
      : [{ label: 'Essencial', value: 1 }, { label: 'Estilo de Vida/ Lazer', value: 2 }, { label: 'Reserva/ Investimento', value: 3 }];
  }

  form = this.fb.group({
    name: ['', [Validators.required, Validators.minLength(2)]],
    subCategory: ['', [Validators.required]],
    naturezaOperacao: [1, [Validators.required]], 
    status: [1, [Validators.required]],
  });

  perfilEmpresa = false;

  constructor(private fb: FormBuilder, private categoryService: CategoryService, private readonly alertService: AlertService, private cdRef: ChangeDetectorRef) { }

  ngOnInit(): void {
    this.validaPerfilUsuario()
    if (this.registro) {
      this.form.patchValue({
        name: this.registro.name,
        subCategory: this.registro.subCategory,
        naturezaOperacao: this.registro.naturezaOperacao,
        status: this.registro.status,
      });
    }
  }

  validaPerfilUsuario(){
    this.perfilEmpresa = localStorage.getItem('usuarioRole') == "Empresa"
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

    const payload = {
      name: this.form.value.name!,
      subCategory: this.form.value.subCategory!,
      naturezaOperacao: this.perfilEmpresa ?  this.form.value.naturezaOperacao :this.form.value.subCategory == 'Receita' ? 0 : this.form.value.naturezaOperacao,
      status: this.form.value.status
    };

    this.saving = true;
    (this.registro ? this.categoryService.atualizar({ id: this.registro.id, ...payload }) : this.categoryService.criar(payload))
      .pipe(finalize(() => (this.saving = false)))
      .subscribe({
        next: () => {
          this.alertService.success(`Categoria salva com sucesso!`);
          this.close(true);
        },
        error: e => this.alertService.error(extrairMensagemErro(e, `Erro ao salvar categoria.`))
      });
  }
}
