import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { Category, CategoryService } from 'src/app/core/services/category.service';

@Component({
  selector: 'app-categoria-form',
  templateUrl: './categoria-form.component.html',
  styleUrls: ['./categoria-form.component.scss']
})
export class CategoriaFormComponent implements OnInit {
  @Input() category: Category | null = null;
  @Output() closed = new EventEmitter<boolean>(); // true => recarregar lista

  saving = false;

  form = this.fb.group({
    name: ['', [Validators.required, Validators.minLength(2)]],
    subCategory: ['', [Validators.required, Validators.required]],
    // status: ['Ativo', [Validators.required]],
  });

  constructor(private fb: FormBuilder, private categoryService: CategoryService) {}

  ngOnInit(): void {
    if (this.category) {
      this.form.patchValue({
        name: this.category.name,
        subCategory: this.category.subCategory,
        // status: this.category.status as any || 'Ativo',
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
        name: this.form.value.name!,
        subCategory: this.form.value.subCategory!,
      };

      if (this.category) {
        await this.categoryService.update(this.category.id, payload);
      } else {
        await this.categoryService.create(payload);
      }

      this.close(true);
    } catch (e) {
      alert('Erro ao salvar categoria.');
    } finally {
      this.saving = false;
    }
  }
}
