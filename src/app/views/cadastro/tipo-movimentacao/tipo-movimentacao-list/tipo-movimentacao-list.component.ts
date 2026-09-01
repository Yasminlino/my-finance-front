import { Component, OnInit, ViewChild } from '@angular/core';
import { ExibirCampos, GridColumn, GridColumnOption } from 'src/app/shared/components/data-grid/data-grid.interface';
import { AlertService } from 'src/app/shared/components/alert.service';
import { GridColumnTypeEnum } from 'src/app/shared/components/data-grid/enum/grid-column.enum';
import { DataGridComponent } from 'src/app/shared/components/data-grid/data-grid.component';
import { TipoMovimentacaoDto } from 'src/app/core/models/tipo-movimentacao.model';
import { TipoMovimentacaoService } from 'src/app/core/services/tipo-movimentacao.service';


@Component({
  selector: 'app-tipo-movimentacao-list',
  templateUrl: './tipo-movimentacao-list.component.html',
  styleUrls: ['./tipo-movimentacao-list.component.scss'],
})
export class TipoMovimentacaoListComponent implements OnInit {

  tipoMovimentacoes: TipoMovimentacaoDto[] = [];
  exibirCampos: ExibirCampos | null = null;
  gridColumns: GridColumn[] = []
  breadcrumb = [{ label: 'Cadastros' }, { label: 'Tipo movimentação' }]

  loading = false;
  q = '';

  showModalForm = false;
  editing: TipoMovimentacaoDto | null = null;
  @ViewChild('grid') grid?: DataGridComponent;

  constructor(private tipoMovimentacaoService: TipoMovimentacaoService, private readonly alertService: AlertService) { }

  async ngOnInit() {
    this.setGridColumns()
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

  private setGridColumns(): void {

    this.gridColumns = [
      { field: 'nomeTipoMovimentacao', header: 'NOME TIPO MOVIMENTAÇÃO', type: GridColumnTypeEnum.Text, width: "40%" },
      { field: 'descricao', header: 'DESCRIÇÃO', type: GridColumnTypeEnum.Text, width: "50%" },
      { field: 'actions', header: 'AÇÕES', type: 'actions', functions: ['edit', 'delete'] },
    ];
  }

  async load() {
    try {
      this.loading = true;
      const response = await this.tipoMovimentacaoService.list();

      this.tipoMovimentacoes = response.map(item => ({
        ...item
      }));

      this.applyFilters();
    } catch (e: any) {
      this.alertService.error(e?.message ?? 'Erro ao carregar Tipos de movimentação.');
    } finally {
      this.loading = false;
    }
  }

  applyFilters() {
    const term = this.q.trim().toLowerCase();

    this.tipoMovimentacoes = [...this.tipoMovimentacoes]
      .sort((a, b) => (a.nomeTipoMovimentacao ?? '').localeCompare(b.nomeTipoMovimentacao ?? ''))
      .filter(c => {
        if (!term) return true;
        return (c.nomeTipoMovimentacao ?? '').toLowerCase().includes(term) || String(c.id).includes(term);
      });
  }

  openCreate() {
    this.editing = null;
    this.showModalForm = true;
  }

  onEdit(tipoC: TipoMovimentacaoDto) {
    this.editing = tipoC;
    this.showModalForm = true;
  }

  closeForm(reload?: boolean) {
    this.showModalForm = false;
    this.editing = null;
    if (reload) this.load();
  }

  async onDelete(c: TipoMovimentacaoDto) {
    const ok = window.confirm(`Excluir o Tipo movimentação "${c.nomeTipoMovimentacao}"?`);
    if (!ok) return;

    try {
      await this.tipoMovimentacaoService.delete(c.id);
      this.alertService.success('Tipo movimentação deletada com sucesso!')
      await this.load();
    } catch (e) {
      this.alertService.error('Falha ao deletar. Tipo movimentação pode estar vinculada a transações.');
    }
  }

  async onDeleteSelected(rows: TipoMovimentacaoDto[]) {
    if (!rows.length) return;

    const ok = window.confirm(`Excluir ${rows.length} Tipo movimentação selecionado(s)?`);
    if (!ok) {
      if (this.grid) {
        this.grid.deleting = false;
      }
      return;
    }

    try {
      var response;
      for (const row of rows) {
        response = await this.tipoMovimentacaoService.delete(row.id);
      }

      if (response) {
        this.alertService.success(`${rows.length} Tipos excluído(s) com sucesso!`);
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
