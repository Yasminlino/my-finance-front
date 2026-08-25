import { ChangeDetectorRef, Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { Category, CategoryService } from 'src/app/core/services/category.service';
import { AlertService } from 'src/app/shared/components/alert.service';

@Component({
  selector: 'app-categoria-form',
  templateUrl: './categoria-form.component.html',
  styleUrls: ['./categoria-form.component.scss']
})
export class CategoriaFormComponent implements OnInit {
  @Input() category: Category | null = null;
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

  async save() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.saving = true;
    
      const payload = {
        name: this.form.value.name!,
        subCategory: this.form.value.subCategory!,
        naturezaOperacao: this.perfilEmpresa ?  this.form.value.naturezaOperacao :this.form.value.subCategory == 'Receita' ? 0 : this.form.value.naturezaOperacao,
        status: this.form.value.status
      };
      
      try {
      if (this.category) {
        await this.categoryService.update(this.category.id, payload);
      } else {
        await this.categoryService.create(payload);
      }
      
      this.alertService.success(`Categoria salva com sucesso!`)
      this.close(true);
    } catch (e) {
      this.alertService.error(`Erro ao salvar categoria.`)
    } finally {
      this.saving = false;
    }
  }
}
