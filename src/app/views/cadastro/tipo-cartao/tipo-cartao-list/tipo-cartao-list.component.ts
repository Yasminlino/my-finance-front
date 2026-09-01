 import { Component, OnInit, ViewChild } from '@angular/core';
import { ExibirCampos, GridColumn, GridColumnOption } from 'src/app/shared/components/data-grid/data-grid.interface';
import { TagStatus } from 'src/app/shared/enums/status.enum';
import { DataGridComponent } from 'src/app/shared/components/data-grid/data-grid.component';
import { AlertService } from 'src/app/shared/components/alert.service';
import { GridColumnTypeEnum } from 'src/app/shared/components/data-grid/enum/grid-column.enum';
import { TipoCartaoDto, TipoCartaoService } from 'src/app/core/services/tipo-cartao.service';


@Component({
  selector: 'app-tipo-cartao-list',
  templateUrl: './tipo-cartao-list.component.html',
  styleUrls: ['./tipo-cartao-list.component.scss'],
})
export class TipoCartaoListComponent implements OnInit {
  tipoCartoes: TipoCartaoDto[] = [];
  tipoCartaoOpcoes: GridColumnOption[] = [];
  exibirCampos: ExibirCampos | null = null;
  gridColumns: GridColumn[] = []
  breadcrumb = [{ label: 'Cadastros' }, { label: 'Tipo Cartão' }]

  loading = false;
  q = '';

  showModalForm = false;
  editing: TipoCartaoDto | null = null;
  @ViewChild('grid') grid?: DataGridComponent;

  constructor(private tipoCartaoService: TipoCartaoService, private readonly alertService: AlertService) { }

  async ngOnInit() {
    await this.getTiposCartao();
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


  private async getTiposCartao(): Promise<void> {
    const res = await this.tipoCartaoService.list();

    this.tipoCartaoOpcoes = res.map(element => ({
      label: element.nomeTipoCartao,
      value: element.nomeTipoCartao
    }));

  }

  private setGridColumns(): void {

    this.gridColumns = [
      { field: 'nomeTipoCartao', header: 'NOME TIPO CARTÃO', type: GridColumnTypeEnum.Text, width: "90%" },
      { field: 'actions', header: 'AÇÕES', type: 'actions', functions: ['edit', 'delete'] },
    ];
  }

  async load() {
    try {
      this.loading = true;
      const response = await this.tipoCartaoService.list();

      this.tipoCartoes = response.map(item => ({
        ...item
      }));

      this.applyFilters();
    } catch (e: any) {
      this.alertService.error(e?.message ?? 'Erro ao carregar Tipos de cartão.');
    } finally {
      this.loading = false;
    }
  }

  applyFilters() {
    const term = this.q.trim().toLowerCase();

    this.tipoCartoes = [...this.tipoCartoes]
      .sort((a, b) => (a.nomeTipoCartao ?? '').localeCompare(b.nomeTipoCartao ?? ''))
      .filter(c => {
        if (!term) return true;
        return (c.nomeTipoCartao ?? '').toLowerCase().includes(term) || String(c.id).includes(term);
      });
  }

  openCreate() {
    this.editing = null;
    this.showModalForm = true;
  }

  onEdit(tipoC: TipoCartaoDto) {
    this.editing = tipoC;
    this.showModalForm = true;
  }

  closeForm(reload?: boolean) {
    this.showModalForm = false;
    this.editing = null;
    if (reload) this.load();
  }

  async onDelete(c: TipoCartaoDto) {
    const ok = window.confirm(`Excluir o Tipo cartão "${c.nomeTipoCartao}"?`);
    if (!ok) return;

    try {
      await this.tipoCartaoService.delete(c.id);
      this.alertService.success('Tipo cartão deletada com sucesso!')
      await this.load();
    } catch (e) {
      this.alertService.error('Falha ao deletar. Tipo cartão pode estar vinculada a transações.');
    }
  }

  async onDeleteSelected(rows: TipoCartaoDto[]) {
    if (!rows.length) return;

    const ok = window.confirm(`Excluir ${rows.length} Tipo cartão selecionado(s)?`);
    if (!ok) {
      if (this.grid) {
        this.grid.deleting = false;
      }
      return;
    }

    try {
      var response;
      for (const row of rows) {
        response = await this.tipoCartaoService.delete(row.id);
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
