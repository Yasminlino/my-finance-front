import { Component, OnInit, ViewChild } from '@angular/core';
import {GridColumn } from 'src/app/shared/components/data-grid/data-grid.interface';
import { AlertService } from 'src/app/shared/components/alert.service';
import { ExclusaoEmLoteService } from 'src/app/core/services/exclusao-em-lote.service';
import { GridColumnTypeEnum } from 'src/app/shared/components/data-grid/enum/grid-column.enum';
import { DataGridComponent } from 'src/app/shared/components/data-grid/data-grid.component';
import { TipoMovimentacaoDto } from 'src/app/core/models/tipo-movimentacao.model';
import { TipoMovimentacaoService } from 'src/app/core/services/tipo-movimentacao.service';
import { EXIBIR_CAMPOS_CADASTRO, ExibirCamposConfig } from 'src/app/shared/models/utils/grid-config.constants';


@Component({
  selector: 'app-tipo-movimentacao-list',
  templateUrl: './tipo-movimentacao-list.component.html',
  styleUrls: ['./tipo-movimentacao-list.component.scss'],
})
export class TipoMovimentacaoListComponent implements OnInit {

  /** Fonte: tudo o que veio da API. */
  tipoMovimentacoes: TipoMovimentacaoDto[] = [];
  /** Projeção exibida no grid — nunca sobrescreve a fonte (ver FE-P0-10). */
  tipoMovimentacoesExibidas: TipoMovimentacaoDto[] = [];
  exibirCampos: ExibirCamposConfig = { ...EXIBIR_CAMPOS_CADASTRO };
  gridColumns: GridColumn[] = []
  breadcrumb = [{ label: 'Cadastros' }, { label: 'Tipo movimentação' }]

  loading = false;
  q = '';

  showModalForm = false;
  editing: TipoMovimentacaoDto | null = null;
  @ViewChild('grid') grid?: DataGridComponent;

  constructor(private tipoMovimentacaoService: TipoMovimentacaoService, private readonly alertService: AlertService, private readonly exclusaoEmLote: ExclusaoEmLoteService) { }

  async ngOnInit() {
    this.setGridColumns()
    await this.load();
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

    this.tipoMovimentacoesExibidas = [...this.tipoMovimentacoes]
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
      await this.exclusaoEmLote.excluir(
        rows,
        row => this.tipoMovimentacaoService.delete(row.id),
        { singular: 'tipo de movimentação', plural: 'tipos de movimentação' }
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
