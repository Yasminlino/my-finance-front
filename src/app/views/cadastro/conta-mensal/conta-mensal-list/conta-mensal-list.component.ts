import { Component, OnInit } from '@angular/core';
import { AccountDto, ContaService } from 'src/app/core/services/contas.service';
import { Category, CategoryService } from 'src/app/core/services/category.service';

type AlertState = { type: 'success' | 'error' | ''; message: string };

@Component({
  selector: 'app-conta-mensal-list',
  templateUrl: './conta-mensal-list.component.html',
  styleUrls: ['./conta-mensal-list.component.scss']
})
export class ContaMensalListComponent implements OnInit {
  accounts: AccountDto[] = [];
  categories: Category[] = [];
  filtered: AccountDto[] = [];

  loading = false;
  errorMsg = '';

  // filtros
  q = '';
  catFilter: 'ALL' | string = 'ALL';

  // total
  total = 0;

  // modal
  showModalForm = false;
  editing: AccountDto | null = null;

  alert: AlertState = { type: '', message: '' };

  constructor(
    private contaService: ContaService,
    private categoryService: CategoryService
  ) { }

  async ngOnInit() {
    await this.load();
  }

  async load() {
    try {
      this.loading = true;
      this.errorMsg = '';

      const [accounts, categories] = await Promise.all([
        this.contaService.list(),
        this.categoryService.list()
      ]);

      this.accounts = accounts ?? [];
      this.categories = categories ?? [];

      this.applyFilters();
    } catch (e: any) {
      this.errorMsg = e?.message ?? 'Erro ao carregar contas.';
    } finally {
      this.loading = false;
    }
  }

  categoryNameOf(categoryId: number) {
    return this.categories.find(c => c.id === categoryId)?.name ?? '—';
  }

  applyFilters() {
    const term = this.q.trim().toLowerCase();

    const catId = this.catFilter === 'ALL' ? null : Number(this.catFilter);

    this.filtered = [...this.accounts]
      .filter(a => (catId ? a.categoryid === catId : true))
      .filter(a => {
        if (!term) return true;
        const catName = this.categoryNameOf(a.categoryid).toLowerCase();
        return (
          (a.name ?? '').toLowerCase().includes(term) ||
          String(a.id).includes(term) ||
          catName.includes(term)
        );
      })
      .sort((a, b) => (a.name ?? '').localeCompare(b.name ?? ''));

    this.total = this.filtered.reduce((sum, a) => sum + (Number(a.value) || 0), 0);
  }

  onSearchChange(v: string) {
    this.q = v;
    this.applyFilters();
  }

  onCatChange(v: string) {
    this.catFilter = v;
    this.applyFilters();
  }

  openCreate() {
    this.editing = null;
    this.showModalForm = true;
  }

  openEdit(acc: AccountDto) {
    this.editing = acc;
    this.showModalForm = true;
  }

  closeForm(reload?: boolean) {
    this.showModalForm = false;
    this.editing = null;
    if (reload) this.load();
  }

  formatCurrency(value: any) {
    const cents = Number(value) || 0;
    const reais = cents / 100;
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(reais);
  }


  async onDelete(acc: AccountDto) {
    const ok = window.confirm('Tem certeza que deseja excluir esta conta?');
    if (!ok) return;

    try {
      await this.contaService.delete(acc.id);

      this.alert = { type: 'success', message: 'Conta deletada com sucesso!' };
      setTimeout(() => (this.alert = { type: '', message: '' }), 3000);

      await this.load();
    } catch {
      this.alert = { type: 'error', message: 'Falha ao deletar conta. Tente novamente.' };
      setTimeout(() => (this.alert = { type: '', message: '' }), 15000);
    }
  }
}
