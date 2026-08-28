import { Component, EventEmitter, Input, OnInit, Output, ViewChild } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { AccountDto, ContaService, ContaVencimentoDto } from 'src/app/core/services/contas.service';
import { Category, CategoryService } from 'src/app/core/services/category.service';
import { formatCurrencyBR, formatMoneyBRFromAny, parseMoneyBRToNumber } from 'src/app/core/utils/mask';
import { ExibirCampos, GridColumn, GridColumnOption } from 'src/app/shared/components/data-grid/data-grid.interface';
import { NaturezaOperacaoLabel } from 'src/app/shared/enums/natureza-operacao.enum';
import { TagStatus } from 'src/app/shared/enums/status.enum';
import { DataGridComponent } from 'src/app/shared/components/data-grid/data-grid.component';
import { AlertService } from 'src/app/shared/components/alert.service';
import { GridColumnTypeEnum } from 'src/app/shared/components/data-grid/enum/grid-column.enum';



@Component({
  selector: 'app-conta-mensal-list',
  templateUrl: './conta-mensal-list.component.html',
  styleUrls: ['./conta-mensal-list.component.scss']
})
export class ContaMensalListComponent implements OnInit {
  contas: AccountDto[] = [];
  categorias: Category[] = [];
  categoriasOptions: GridColumnOption[] = [];
  exibirCampos: ExibirCampos | null = null;
  gridColumns: GridColumn[] = []

  money(v: any) { return formatCurrencyBR(v); }

  statusOptions: GridColumnOption[] = [
    { label: 'Ativo', value: 1, classe: TagStatus.Success },
    { label: 'Inativo', value: 0, classe: TagStatus.Secondary }
  ];

  statusLabel(value: number): string {
    return value === 1 ? 'Ativo' : 'Inativo';
  }

  categoria: Category[] = [];
  breadcrumb = [{ label: 'Cadastros' }, { label: 'Contas' }]

  loading = false;
  errorMsg = '';

  q = '';
  statusFilter: 'ALL' | 'Ativo' | 'Inativo' = 'ALL';

  showModalForm = false;
  editing: AccountDto | null = null;
  @ViewChild('grid') grid?: DataGridComponent;

  constructor(private categoryService: CategoryService, private contaService: ContaService, private readonly alertService: AlertService) { }

  async ngOnInit() {
    await this.getCategory();
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


  private async getCategory(): Promise<void> {
    const res = await this.categoryService.buscarCategoriasAtivas();

    this.categorias = res;

    this.categoriasOptions = res.map(element => ({
      label: element.name,
      value: element.name
    }));

  }

  private setGridColumns(): void {

    this.gridColumns = [
      { field: 'name', header: 'NOME', type: GridColumnTypeEnum.Text, width: "25%" },
      {
        field: "value",
        header: "VALOR",
        type: GridColumnTypeEnum.Money,
        formatter: (row) => this.money(row.value),
        width: '12%',
        editable: true
      },
      {
        field: 'diasVencimentoSort',
        header: 'DIA VENCIMENTO',
        type: GridColumnTypeEnum.Number,
        formatter: (row) => this.getDatas(row.contaVencimentos),
        width: "15%"
      },
      {
        field: 'parcelaAtual',
        header: 'PARCELA',
        type: GridColumnTypeEnum.Number,
        formatter: (row) => this.formataParcela(row),
        width: "10%"
      },
      {
        field: "categoryName",
        header: "CATEGORIA",
        type: GridColumnTypeEnum.Select,
        options: this.categoriasOptions,
        width: '18%',
        editable: false
      },
      {
        field: 'status',
        header: 'STATUS',
        type: 'select',
        options: this.statusOptions,
        formatter: (row) => this.statusLabel(row.status),
        width: "10%"
      },
      { field: 'actions', header: 'Ações', type: 'actions', functions: ['edit', 'delete'] },
    ];
  }

  formataParcela(conta: AccountDto): any {
    if (!conta.ehParcelado) {
      return "-"
    }

    return conta.parcelaAtual + "/" + conta.quantidadeParcelas
  }

  getDatas(conta: ContaVencimentoDto[] | undefined): string {
  if (!conta || conta.length === 0) {
    return '-';
  }

  return conta.map(datas => datas.dia).join(', ');
}

async load() {
  try {
    this.loading = true;
    const response = await this.contaService.list();
    
    this.contas = response.map(item => ({
      ...item,
      // Pega o primeiro dia como número para ordenação correta, ou 0 se vazio
      diasVencimentoSort: item.contaVencimentos && item.contaVencimentos.length > 0 
        ? Number(item.contaVencimentos[0].dia) 
        : 0,
      diasVencimentoString: this.getDatas(item.contaVencimentos)
    }));

    this.applyFilters();
  } catch (e: any) {
    this.alertService.error(e?.message ?? 'Erro ao carregar contas.')
  } finally {
    this.loading = false;
  }
}

  applyFilters() {
    const term = this.q.trim().toLowerCase();

    this.contas = [...this.contas]
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

  openCreate() {
    this.editing = null;
    this.showModalForm = true;
  }

  onEdit(conta: AccountDto) {
    this.editing = conta;
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

  async onDelete(c: AccountDto) {
    const ok = window.confirm(`Excluir a conta "${c.name}"?`);
    if (!ok) return;

    try {
      await this.contaService.delete(c.id);
      this.alertService.success('Conta deletada com sucesso!')
      await this.load();
    } catch (e) {
      this.alertService.error('Falha ao deletar. Conta pode estar vinculada a transações.');
    }
  }

  async onDeleteSelected(rows: AccountDto[]) {
    if (!rows.length) return;

    const ok = window.confirm(`Excluir ${rows.length} conta(s) selecionada(s)?`);
    if (!ok) {
      if (this.grid) {
        this.grid.deleting = false;
      }
      return;
    }

    try {
      var response;
      for (const row of rows) {
        response = await this.contaService.delete(row.id);
      }

      if (response) {
        this.alertService.success(`${rows.length} conta(s) excluída(s) com sucesso!`);
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
