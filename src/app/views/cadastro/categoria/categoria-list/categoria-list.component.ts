import { Component, OnInit } from '@angular/core';
import { Category, CategoryService } from 'src/app/core/services/category.service';

type AlertState = { type: 'success' | 'error' | '' ; message: string };

@Component({
  selector: 'app-categoria-list',
  templateUrl: './categoria-list.component.html',
  styleUrls: ['./categoria-list.component.scss']
})
export class CategoriaListComponent implements OnInit {
  categorias: Category[] = [];
  categoria: Category[] = [];

  loading = false;
  errorMsg = '';

  q = '';
  statusFilter: 'ALL' | 'Ativo' | 'Inativo' = 'ALL';

  // modal state
  showModalForm = false;
  editing: Category | null = null;

  alert: AlertState = { type: '', message: '' };

  constructor(private categoryService: CategoryService) {}

  async ngOnInit() {
    await this.load();
  }

  async load() {
    try {
      this.loading = true;
      this.errorMsg = '';
      this.categorias = await this.categoryService.list();
      this.applyFilters();
    } catch (e: any) {
      this.errorMsg = e?.message ?? 'Erro ao carregar categorias.';
    } finally {
      this.loading = false;
    }
  }

  applyFilters() {
    const term = this.q.trim().toLowerCase();

    this.categoria = [...this.categorias]
      .sort((a, b) => (a.name ?? '').localeCompare(b.name ?? ''))
      .filter(c => {
        if (!term) return true;
        return (c.name ?? '').toLowerCase().includes(term) || String(c.id).includes(term);
      });
  }

  onSearchChange(value: string) {
    this.q = value;
    this.applyFilters();
  }

  onStatusChange(value: any) {
    this.statusFilter = value;
    this.applyFilters();
  }

  badgeClass(status: string) {
    if (status === 'Ativo') return 'badge bg-success';
    if (status === 'Inativo') return 'badge bg-secondary';
    return 'badge bg-muted';
  }

  openCreate() {
    this.editing = null;
    this.showModalForm = true;
  }

  onEdit(categoria: Category) {
    this.editing = categoria;
    this.showModalForm = true;
  }

  closeForm(reload?: boolean) {
    this.showModalForm = false;
    this.editing = null;

    if (reload) this.load();
  }

  async onDelete(c: Category) {
    const ok = window.confirm(`Excluir a categoria "${c.name}"?`);
    if (!ok) return;

    try {
      await this.categoryService.delete(c.id);

      this.alert = { type: 'success', message: 'Categoria deletada com sucesso!' };
      setTimeout(() => (this.alert = { type: '', message: '' }), 3000);

      await this.load();
    } catch (e) {
      this.alert = {
        type: 'error',
        message: 'Falha ao deletar. Categoria pode estar vinculada a transações.',
      };
      setTimeout(() => (this.alert = { type: '', message: '' }), 12000);
    }
  }
}
