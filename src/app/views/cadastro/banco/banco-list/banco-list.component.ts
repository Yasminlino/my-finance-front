import { Component, EventEmitter, Input, OnInit, Output, ViewChild } from '@angular/core';
import { Category } from 'src/app/core/services/category.service';
import { formatCurrencyBR, formatMoneyBRFromAny, parseMoneyBRToNumber } from 'src/app/core/utils/mask';
import { ExibirCampos, GridColumn, GridColumnOption } from 'src/app/shared/components/data-grid/data-grid.interface';
import { NaturezaOperacaoLabel } from 'src/app/shared/enums/natureza-operacao.enum';
import { TagStatus } from 'src/app/shared/enums/status.enum';
import { DataGridComponent } from 'src/app/shared/components/data-grid/data-grid.component';
import { AlertService } from 'src/app/shared/components/alert.service';
import { GridColumnTypeEnum } from 'src/app/shared/components/data-grid/enum/grid-column.enum';
import { TipoCartao, TipoCartaoService } from 'src/app/core/services/tipo-cartao.service';
import { BancoService } from 'src/app/core/services/banco.service';
import { BancoDto } from 'src/app/core/interfaces/banco.interface';


@Component({
  selector: 'app-banco-list',
  templateUrl: './banco-list.component.html',
  styleUrls: ['./banco-list.component.scss'],
})
export class BancoListComponent implements OnInit {
  bancos: BancoDto[] = [];
  tiposCartao: TipoCartao[] = [];
  tipoCartaoOpcoes: GridColumnOption[] = [];
  exibirCampos: ExibirCampos | null = null;
  gridColumns: GridColumn[] = []

  money(v: any) { return formatCurrencyBR(v); }

  statusOptions: GridColumnOption[] = [
    { label: 'Ativo', value: 1, classe: TagStatus.Success },
    { label: 'Inativo', value: 0, classe: TagStatus.Secondary }
  ];

  statusLabel(value: boolean): string {
    return value === true ? 'Ativo' : 'Inativo';
  }

  breadcrumb = [{ label: 'Cadastros' }, { label: 'Bancos' }]

  loading = false;
  errorMsg = '';

  q = '';
  statusFilter: 'ALL' | 'Ativo' | 'Inativo' = 'ALL';

  showModalForm = false;
  editing: BancoDto | null = null;
  @ViewChild('grid') grid?: DataGridComponent;

  constructor(private tipoCartaoService: TipoCartaoService, private bancoService: BancoService, private readonly alertService: AlertService) { }

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

    this.tiposCartao = res;

    this.tipoCartaoOpcoes = res.map(element => ({
      label: element.nomeTipoCartao,
      value: element.nomeTipoCartao
    }));

  }

  private setGridColumns(): void {

    this.gridColumns = [
      { field: 'nomeBanco', header: 'NOME BANCO', type: GridColumnTypeEnum.Text, width: "25%" },
      {
        field: "nomeTipoCartaoFormatado",
        header: "TIPO CARTÃO",
        type: GridColumnTypeEnum.Select,
        options: this.tipoCartaoOpcoes,
        width: '25%',
        editable: false
      },
      {
        field: "saldoInicial",
        header: "SALDO INICIAL",
        type: GridColumnTypeEnum.Money,
        formatter: (row) => this.money(row.saldoInicial),
        width: '20%',
        editable: true
      },
      {
        field: 'status',
        header: 'STATUS',
        type: 'select',
        options: this.statusOptions,
        formatter: (row) => this.statusLabel(row.status),
        width: "20%"
      },
      { field: 'actions', header: 'AÇÕES', type: 'actions', functions: ['edit', 'delete'] },
    ];
  }
  getTipoCadastrado(row: TipoCartao) {
    return row.nomeTipoCartao
  }

  async load() {
    try {
      this.loading = true;
      const response = await this.bancoService.list();

      this.bancos = response.map(item => ({
        ...item,
        
        nomeTipoCartaoFormatado: item.tipoCartao?.nomeTipoCartao ||
          this.tiposCartao.find(t => t.id === item.tipoCartaoId)?.nomeTipoCartao || '-',
        status: item.ativo ? 1 : 0
      }));

      this.applyFilters();
    } catch (e: any) {
      this.alertService.error(e?.message ?? 'Erro ao carregar bancos.');
    } finally {
      this.loading = false;
    }
  }

  applyFilters() {
    const term = this.q.trim().toLowerCase();

    this.bancos = [...this.bancos]
      .sort((a, b) => (a.nomeBanco ?? '').localeCompare(b.nomeBanco ?? ''))
      .filter(c => {
        if (!term) return true;
        return (c.nomeBanco ?? '').toLowerCase().includes(term) || String(c.id).includes(term);
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

  openCreate() {
    this.editing = null;
    this.showModalForm = true;
  }

  onEdit(banco: BancoDto) {
    this.editing = banco;
    this.showModalForm = true;
  }

  openEdit(banco: BancoDto) {
    this.editing = banco;
    this.showModalForm = true;
  }

  closeForm(reload?: boolean) {
    this.showModalForm = false;
    this.editing = null;
    if (reload) this.load();
  }

  async onDelete(c: BancoDto) {
    const ok = window.confirm(`Excluir o banco "${c.nomeBanco}"?`);
    if (!ok) return;

    try {
      await this.bancoService.delete(c.id);
      this.alertService.success('Banco deletada com sucesso!')
      await this.load();
    } catch (e) {
      this.alertService.error('Falha ao deletar. Banco pode estar vinculada a transações.');
    }
  }

  async onDeleteSelected(rows: BancoDto[]) {
    if (!rows.length) return;

    const ok = window.confirm(`Excluir ${rows.length} banco(s) selecionado(s)?`);
    if (!ok) {
      if (this.grid) {
        this.grid.deleting = false;
      }
      return;
    }

    try {
      var response;
      for (const row of rows) {
        response = await this.bancoService.delete(row.id);
      }

      if (response) {
        this.alertService.success(`${rows.length} banco(s) excluído(s) com sucesso!`);
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
