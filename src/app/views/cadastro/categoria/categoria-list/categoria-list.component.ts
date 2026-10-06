import { Component, OnInit, ViewChild } from '@angular/core';
import { Category, CategoryService } from 'src/app/core/services/category.service';
import { NaturezaOperacaoLabel } from 'src/app/shared/enums/natureza-operacao.enum';
import { DataGridComponent } from 'src/app/shared/components/data-grid/data-grid.component';
import { GridColumn, GridColumnOption } from 'src/app/shared/components/data-grid/data-grid.interface';
import { TagStatus } from 'src/app/shared/enums/status.enum';
import { AlertService } from 'src/app/shared/components/alert.service';
import { extrairMensagemErro } from 'src/app/core/utils/http-error';
import { ExclusaoEmLoteService } from 'src/app/core/services/exclusao-em-lote.service';
import { EXIBIR_CAMPOS_CADASTRO, ExibirCamposConfig } from 'src/app/shared/models/utils/grid-config.constants';

@Component({
  selector: 'app-categoria-list',
  templateUrl: './categoria-list.component.html',
  styleUrls: ['./categoria-list.component.scss']
})
export class CategoriaListComponent implements OnInit {
  /** Fonte: tudo o que veio da API. */
  categorias: Category[] = [];
  /** Projeção exibida no grid — é o que o applyFilters() preenche (ver FE-P0-03/FE-P0-10). */
  categoriasExibidas: Category[] = [];
  exibirCampos: ExibirCamposConfig = { ...EXIBIR_CAMPOS_CADASTRO };

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

  breadcrumb = [{ label: 'Cadastros' }, { label: 'Categorias' }]

  loading = false;
  errorMsg = '';

  q = '';
  statusFilter: 'ALL' | 'Ativo' | 'Inativo' = 'ALL';

  showModalForm = false;
  editing: Category | null = null;
  @ViewChild('grid') grid?: DataGridComponent;

  constructor(private categoryService: CategoryService, private readonly alertService: AlertService, private readonly exclusaoEmLote: ExclusaoEmLoteService) { }

  async ngOnInit() {
    await this.load();
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

    this.categoriasExibidas = [...this.categorias]
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
      this.alertService.error(extrairMensagemErro(e, 'Falha ao deletar. Categoria pode estar vinculada a transações.'));
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
      await this.exclusaoEmLote.excluir(
        rows,
        row => this.categoryService.delete(row.id),
        { singular: 'categoria', plural: 'categorias', feminino: true }
      );

      this.grid?.clearSelection();
      await this.load();
    } finally {
      if (this.grid) {
        this.grid.deleting = false;
      }
    }
  }
}
