
import { Component, OnInit, ViewChild } from '@angular/core';
import { DataGridComponent } from 'src/app/shared/components/data-grid/data-grid.component';
import { GridColumn, GridColumnOption } from 'src/app/shared/components/data-grid/data-grid.interface';
import { TagStatus } from 'src/app/shared/enums/status.enum';
import { AlertService } from 'src/app/shared/components/alert.service';
import { ExclusaoEmLoteService } from 'src/app/core/services/exclusao-em-lote.service';
import { ListaDto, ListaService } from 'src/app/core/services/lista.service';
import { Router } from '@angular/router';
import { EXIBIR_CAMPOS_CADASTRO, ExibirCamposConfig } from 'src/app/shared/models/utils/grid-config.constants';

@Component({
  selector: 'app-lista-root',
  templateUrl: './lista-root.component.html',
  styleUrls: ['./lista-root.component.scss'],
})
export class ListaRootComponent implements OnInit {
  listas: ListaDto[] = [];
  exibirCampos: ExibirCamposConfig = { ...EXIBIR_CAMPOS_CADASTRO, buttonViewLine: true };
  gridColumns: GridColumn[] = [];

  statusOptions: GridColumnOption[] = [
    { label: 'Ativo', value: true, classe: TagStatus.Success },
    { label: 'Inativo', value: false, classe: TagStatus.Secondary }
  ];

  statusLabel(value: boolean): string {
    return value === true ? 'Ativo' : 'Inativo';
  }

  lista: ListaDto[] = [];
  breadcrumb = [{ label: 'Catalago' }, { label: 'Listas' }]

  loading = false;
  errorMsg = '';

  q = '';
  statusFilter: 'ALL' | 'Ativo' | 'Inativo' = 'ALL';

  showModalCreate = false;
  showModalUpdate = false;

  editing: ListaDto | null = null;
  @ViewChild('grid') grid?: DataGridComponent;

  constructor(private listaService: ListaService, private readonly alertService: AlertService, private readonly exclusaoEmLote: ExclusaoEmLoteService, private readonly router: Router) { }

  async ngOnInit() {
    this.setGridColumns();
    await this.load();
  }

  private setGridColumns(): void {
    this.gridColumns = [
      { field: 'nome', header: 'Nome', type: 'text', width: "40%" },
      {
        field: 'tipoMovimentacao',
        header: 'TIPO',
        type: 'select',
        options: [
          { label: 'Checklist', value: 1 },
          { label: 'Cronograma', value: 2 },
          { label: 'Orçamento', value: 3 }
        ],
        width: "30%"
      },
      {
        field: 'status',
        header: 'STATUS',
        type: 'select',
        options: this.statusOptions,
        formatter: (row) => this.statusLabel(row.status),
        width: "20%"
      },
      { field: 'actions', header: 'Ações', type: 'actions', functions: ['view', 'edit', 'delete'] },
    ]
  }

  async load() {
    try {
      this.loading = true;
      this.listas = await this.listaService.list();
      console.log('Listas carregadas:', this.listas);
      this.applyFilters();
    } catch (e: any) {
      this.alertService.error(e?.message ?? 'Erro ao carregar listas.')
    } finally {
      this.loading = false;
    }
  }

  applyFilters() {
    const term = this.q.trim().toLowerCase();

    this.lista = [...this.listas]
      .sort((a, b) => (a.nome ?? '').localeCompare(b.nome ?? ''))
      .filter(c => {
        if (!term) return true;
        return (c.nome ?? '').toLowerCase().includes(term) || String(c.id).includes(term);
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

  badgeClass(status: boolean) {
    if (status === true) return 'badge bg-success';
    if (status === false) return 'badge bg-secondary';
    return 'badge bg-muted';
  }

  openCreate() {
    this.editing = null;
    this.showModalCreate = true;
  }

  onEdit(lista: ListaDto) {
    this.editing = lista;
    this.showModalUpdate = true;
  }

  abrirItemLista(item: ListaDto) {
    if (!item.tipoMovimentacao) return;
    if (item.tipoMovimentacao === 1) {
      this.router.navigate([`/catalogos-listas/${item.id}/checagem`]);
    } else if (item.tipoMovimentacao === 2) {
      window.open(`/#/catalogos-listas/${item.id}/cronograma`, '_blank');
    } else if (item.tipoMovimentacao === 3) {
      this.router.navigate([`/catalogos-listas/${item.id}/orcamento`]);
    } else {
      window.open(`/catalogos-listas/${item.id}`, '_blank');
    }

  }

  fecharModalCriar(reload: boolean) {
    this.showModalCreate = false;
    if (reload) this.load();
  }

  fecharModalAtualizar(reload: boolean) {
    this.showModalUpdate = false;
    this.editing = null;
    if (reload) this.load();
  }

  async onDelete(c: ListaDto) {
    const ok = window.confirm(`Excluir a lista "${c.nome}"?`);
    if (!ok) return;

    try {
      await this.listaService.delete(c.id);
      this.alertService.success('Lista deletada com sucesso!')
      await this.load();
    } catch (e) {
      this.alertService.error('Falha ao deletar. Lista pode estar vinculada a transações.');
    }
  }

  async onDeleteSelected(rows: ListaDto[]) {
    if (!rows.length) return;

    const ok = window.confirm(`Excluir ${rows.length} lista(s) selecionada(s)?`);
    if (!ok) {
      if (this.grid) {
        this.grid.deleting = false;
      }
      return;
    }

    try {
      await this.exclusaoEmLote.excluir(
        rows,
        row => this.listaService.delete(row.id),
        { singular: 'lista', plural: 'listas', feminino: true }
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
