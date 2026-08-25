import { Component, OnInit, ViewChild } from '@angular/core';
import { Category, CategoryService } from 'src/app/core/services/category.service';
import { NaturezaOperacaoLabel } from 'src/app/shared/enums/natureza-operacao.enum';
import { DataGridComponent } from 'src/app/shared/components/data-grid/data-grid.component';
import { ExibirCampos, GridColumn, GridColumnOption, GridRowChange } from 'src/app/shared/components/data-grid/data-grid.interface';
import { TagStatus } from 'src/app/shared/enums/status.enum';
import { AlertService } from 'src/app/shared/components/alert.service';

@Component({
  selector: 'app-categoria-list',
  templateUrl: './categoria-list.component.html',
  styleUrls: ['./categoria-list.component.scss']
})
export class CategoriaListComponent implements OnInit {
  categorias: Category[] = [];
  exibirCampos: ExibirCampos | null = null;
  deleting: boolean = false

  naturezaOperacaoOptions: GridColumnOption[] = Object.entries(NaturezaOperacaoLabel).map(([value, label]) => ({
    label,
    value: Number(value)
  }));

  statusOptions: GridColumnOption[] = [
    { label: 'Ativo', value: 1, classe: TagStatus.Success },
    { label: 'Inativo', value: 0, classe: TagStatus.Secondary }
  ];

  gridColumns: GridColumn[] = [
    { field: 'name', header: 'Nome', type: 'text', width: "30%" },
    {
      field: 'subCategory',
      header: 'Tipo Categoria',
      type: 'select',
      options: [
        { label: 'Despesa', value: 'Despesa' },
        { label: 'Receita', value: 'Receita' },
        { label: 'Investimento', value: 'Investimento' }
      ],
      width: "20%"
    },
    {
      field: 'naturezaOperacao',
      header: 'Natureza da Operação',
      type: 'select',
      options: this.naturezaOperacaoOptions,
      formatter: (row) => NaturezaOperacaoLabel[row.naturezaOperacao] ?? row.naturezaOperacao,
      width: "21%"
    },
    {
      field: 'status',
      header: 'Status',
      type: 'select',
      options: this.statusOptions,
      formatter: (row) => this.statusLabel(row.status),
      width: "20%"
    },
    { field: 'actions', header: 'Ações', type: 'actions', functions: ['edit', 'delete'] },
  ];

  statusLabel(value: number): string {
    return value === 1 ? 'Ativo' : 'Inativo';
  }

  categoria: Category[] = [];
  breadcrumb = [{ label: 'Cadastros' }, { label: 'Categorias' }]

  loading = false;
  errorMsg = '';

  q = '';
  statusFilter: 'ALL' | 'Ativo' | 'Inativo' = 'ALL';

  showModalForm = false;
  editing: Category | null = null;
  @ViewChild('grid') grid?: DataGridComponent;

  constructor(private categoryService: CategoryService, private readonly alertService: AlertService) { }

  async ngOnInit() {
    this.setExibirCampos()
    await this.load();
  }

  private setExibirCampos(): void {
    this.exibirCampos = {
      filter: true,
      sortable: true,
      selected: true,
      paginator: true,
      buttonDeleteAll: true,
      buttonNew: true,
      buttonLock: false,
      buttonPopUp: false,
      buttonEditLine: true,
      buttonDeleteLine: true,
      buttonSaveCancel: false,
    }
  }


  async load() {
    try {
      this.loading = true;
      this.categorias = await this.categoryService.list();
      console.log('Categorias carregadas:', this.categorias);
      this.applyFilters();
    } catch (e: any) {
      this.alertService.error(e?.message ?? 'Erro ao carregar categorias.')
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
      this.alertService.success('Categoria deletada com sucesso!')
      await this.load();
    } catch (e) {
      this.alertService.error('Falha ao deletar. Categoria pode estar vinculada a transações.');
    }
  }

  async onDeleteSelected(rows: Category[]) {
    if (!rows.length) return;

    const ok = window.confirm(`Excluir ${rows.length} categoria(s) selecionada(s)?`);
    if (!ok) {
      if (this.grid) {
        this.grid.deleting = false;
      }
      return;
    }

    try {
      var response;
      for (const row of rows) {
        response = await this.categoryService.delete(row.id);
      }

      if (response) {
        this.alertService.success(`${rows.length} categoria(s) excluída(s) com sucesso!`);
      }

      this.grid?.clearSelection();
      await this.load();
    } catch (e) {
      this.alertService.error(`'${rows.length}' itens deram erros ao deletar!`);
    } finally {
      if (this.grid) {
        this.grid.deleting = false;
      }
    }
  }
}
