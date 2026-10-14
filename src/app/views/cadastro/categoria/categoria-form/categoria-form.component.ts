import { ChangeDetectorRef, Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { CategoryService } from 'src/app/core/services/category.service';
import { AlertService } from 'src/app/shared/components/alert.service';
import { extrairMensagemErro } from 'src/app/core/utils/http-error';
import { CategoriaDto } from 'src/app/core/models/categoria.model';
import { finalize } from 'rxjs';

@Component({
  selector: 'app-categoria-form',
  templateUrl: './categoria-form.component.html',
  styleUrls: ['./categoria-form.component.scss']
})
export class CategoriaFormComponent implements OnInit {
  @Input() category: CategoriaDto | null = null;
  @Output() closed = new EventEmitter<boolean>();

  saving = false;

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
    if (this.category) {
      this.form.patchValue({
        name: this.category.name,
        subCategory: this.category.subCategory,
        naturezaOperacao: this.category.naturezaOperacao,
        status: this.category.status,
      });
    }
  }

  validaPerfilUsuario(){
    this.perfilEmpresa = localStorage.getItem('usuarioRole') == "Empresa"
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
    (this.category ? this.categoryService.atualizar({ id: this.category.id, ...payload }) : this.categoryService.criar(payload))
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
