import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { FormBuilder, Validators, ReactiveFormsModule } from '@angular/forms';
import { CategoryService } from 'src/app/core/services/category.service';
import { AlertService } from 'src/app/shared/components/alert.service';
import { extrairMensagemErro } from 'src/app/core/utils/http-error';
import { CategoriaDto } from 'src/app/core/models/categoria.model';
import { finalize } from 'rxjs';

@Component({
  selector: 'app-categoria-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './categoria-form.component.html',
  styleUrls: ['./categoria-form.component.scss']
})
export class CategoriaFormComponent implements OnInit {
  /** Registro em edição; null = novo (mesmo nome nos 5 cadastros, FE-P2-12). */
  @Input() registro: CategoriaDto | null = null;
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
