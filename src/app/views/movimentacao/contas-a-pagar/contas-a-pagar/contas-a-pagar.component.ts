import { Component, OnInit, ViewChild } from '@angular/core';
import { FormBuilder } from '@angular/forms';
import { LinhaContasMensais } from 'src/app/core/models/conta-mensal.model';
import { formatCurrencyBR, formatDateInput, formatYearMonth, removeFormatCurrencyBR } from 'src/app/core/utils/mask';
import { DataGridComponent } from 'src/app/shared/components/data-grid/data-grid.component';
import { GridColumn, TypeGrid, GridRowChange, GridColumnOption, ExibirCampos } from "src/app/shared/components/data-grid/data-grid.interface"
import { ContaMensalService } from 'src/app/core/services/conta-mensal.service';
import { formatDateVencimentoView } from 'src/app/core/utils/mask';
import { CategoryService } from 'src/app/core/services/category.service';
import { Category } from 'src/app/core/services/category.service';
import { RowForm } from 'src/app/core/interfaces/conta-mensal.interface';
import { GridColumnTypeEnum } from 'src/app/shared/components/data-grid/enum/grid-column.enum';
import { MenuItem } from 'primeng/api';
import { AlertService } from 'src/app/shared/components/alert.service';
import { TagStatus } from 'src/app/shared/enums/status.enum';

@Component({
  selector: 'app-contas-a-pagar',
  templateUrl: './contas-a-pagar.component.html',
  styleUrls: ['./contas-a-pagar.component.scss']
})
export class ContasAPagarComponent implements OnInit {
  @ViewChild('grid') grid?: DataGridComponent;
  breadcrumb = [] = [{ label: 'Cadastros' }, { label: 'Contas Mensais' }]
  titulo = 'Contas a Pagar'
  tipoTabela = TypeGrid.editaLinha
  contasMensais: LinhaContasMensais[] = [];
  dateFilter: Date | undefined
  categorias: GridColumnOption[] = [];
  gridColumns: GridColumn[] = [];
  itemsButtom: MenuItem[] = [];

  showModalForm = false;
  editing: LinhaContasMensais | null = null;

  statusOptions: GridColumnOption[] = [
    { label: 'PENDENTE', value: 'PENDENTE', classe: TagStatus.Danger },
    { label: 'PAGO NO PRAZO', value: 'PAGO NO PRAZO', classe: TagStatus.Success },
    { label: 'AGUARDANDO', value: 'AGUARDANDO', classe: TagStatus.Alert },
    { label: 'PAGO ATRASADO', value: 'PAGO ATRASADO', classe: TagStatus.Warning }
  ];

  showModalAdd: boolean = false;
  deletingId: number | null = null;
  selectedMonth: any;
  loading: boolean = false;
  selectedTotals = { receita: 0, despesa: 0, saldo: 0, count: 0 };
  exibirCampos: ExibirCampos | null = null;

  showModalCreate: boolean = false;

  statusLabel(value: number): string {
    return value === 1 ? 'Ativo' : 'Inativo';
  }

  rowForms = new Map<number, RowForm>();

  categoriaOptions: string[] = [];

  money(v: any) { return formatCurrencyBR(v); }
  dateInput(v: any) { return formatDateInput(v); }


  constructor(private fb: FormBuilder, private contaMensalService: ContaMensalService, private readonly categoryService: CategoryService, private readonly alertService: AlertService) { }

  private getCurrentYearMonth(): string {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  }

  async ngOnInit() {
    await this.getCategory();
    this.setGridColumns();
    this.setitemsButtom();
    this.setExibirCampos();

    await this.loadMonth();
  }

  private setExibirCampos(): void {
    this.exibirCampos = {
      filter: true,
      sortable: true,
      selected: true,
      paginator: true,
      filterMonth: true,
      buttonDeleteAll: true,
      buttonNew: false,
      buttonLock: true,
      buttonPopUp: true,
      buttonEditLine: false,
      buttonDeleteLine: true,
      buttonSaveCancel: true,
    }
  }

  private setitemsButtom(): void {
    this.itemsButtom = [
      {
        label: 'Novo',
        icon: 'pi pi-plus',
        command: () => {
          this.onOpenCreate();
        }
      },
      {
        label: 'Adicionar em lote',
        icon: 'pi pi-plus',
        command: () => {
          this.onOpenAddBatch();
        }
      },
      {
        label: 'Exportar',
        icon: 'pi pi-upload',
        command: () => {
          this.grid?.onExport();
        }
      },
      {
        label: 'Atualizar',
        icon: 'pi pi-refresh',
        command: () => {
          this.loadMonth();
        }
      },
    ];
  }

  private setGridColumns(): void {
    this.gridColumns = [
      {
        field: "accountName",
        header: "Conta",
        type: GridColumnTypeEnum.Text,
        width: '15%',
        editable: false
      },
      {
        field: "categoryName",
        header: "Categoria",
        type: GridColumnTypeEnum.Select,
        options: this.categorias,
        width: '12%',
        editable: false
      },
      {
        field: "parcelaAtual",
        header: "Parcela",
        type: GridColumnTypeEnum.Number,
        width: '8.5%',
        editable: true
      },
      {
        field: "observacao",
        header: "Observação",
        type: GridColumnTypeEnum.TextArea,
        width: '13%',
        editable: true
      },
      {
        field: "value",
        header: "Valor",
        type: GridColumnTypeEnum.Money,
        formatter: (row) => this.money(row.value),
        width: '12%',
        editable: true
      },
      {
        field: "date",
        header: "Vencimento",
        type: GridColumnTypeEnum.Date,
        formatter: (row) =>
          formatDateVencimentoView(row.date),
        width: '15%',
        editable: true
      },
      {
        field: "status",
        header: "Status",
        type: GridColumnTypeEnum.Select,
        options: this.statusOptions,
        width: '17%',
        editable: true
      },
      {
        field: 'actions',
        header: 'Ações',
        type: GridColumnTypeEnum.Actions,
        functions: ['delete']
      }
    ];
  }


  private async getCategory(): Promise<void> {
    const res = await this.categoryService.buscarCategoriasAtivas();

    this.categorias = res.map(element => ({
      label: element.name,
      value: element.name
    }));
  }

  async loadMonth(dataSelecionada?: Date) {
    try {
      this.loading = true;

      if (dataSelecionada) {
        this.dateFilter = dataSelecionada;
        localStorage.setItem('dataFiltroContaMensal', dataSelecionada.toISOString());
      } else {
        const ultimoMesSelecionado = localStorage.getItem('dataFiltroContaMensal');
        this.dateFilter = ultimoMesSelecionado ? new Date(ultimoMesSelecionado) : new Date();
      }

      const mesFormatado = formatYearMonth(this.dateFilter);
      this.selectedMonth = mesFormatado
      this.contasMensais = await this.contaMensalService.BuscarContasMensais(mesFormatado, false);
      console.log(this.contasMensais)
    } catch {
      // Trata o erro
    } finally {
      this.loading = false;
    }
  }



  onEdit(contaMensal: LinhaContasMensais) {
    this.editing = contaMensal;
    this.showModalForm = true;
  }

  async onDeleteSelected(rows: Category[]) {
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
        response = await this.contaMensalService.deleteTransaction(row.id);
      }

      if (response) {
        this.alertService.success(`'${rows.length}' itens deletados com sucesso!`);
      }

      this.grid?.clearSelection();
      await this.loadMonth();
    } catch (e) {
      this.alertService.error(`'${rows.length}' itens deram erros ao deletar!`);
    } finally {
      if (this.grid) {
        this.grid.deleting = false;
      }
    }
  }



  async onDelete(row: LinhaContasMensais) {
    const ok = window.confirm(`Excluir a conta '${row.name}'?`);
    if (!ok) return;

    // Define o ID que está sendo deletado (ativa o loading na linha correspondente)
    this.deletingId = row.id;

    try {
      const response = await this.contaMensalService.deleteTransaction(row.id);

      if (response) {
        this.alertService.success(`Conta '${row.name}' deletada com sucesso!`);
      }

      await this.loadMonth();
    } catch (e: any) {
      this.alertService.error(e);
    } finally {
      // 🔹 O loading só some aqui, quando a API termina (com sucesso ou erro)
      this.deletingId = null;
    }
  }

  // 1. Obtenha a referência do seu componente data-grid no HTML do pai
  // Substitua 'AppDataGridComponent' pelo nome real da classe do seu componente de grid


  /** Salva em lote as alterações feitas via edição inline ("Salvar tudo"). */
  async onSaveInline(changes: GridRowChange[]) {
    if (!changes.length) {
      return;
    }

    try {
      var response;
      for (const change of changes) {
        const updatedPayload = {
          ...change.row,
          ...change.changes
        };
        response = await this.contaMensalService.updateTransaction(updatedPayload);
      }

      if (response) {
        this.alertService.success(`${changes.length} alteração(ões) salva(s) com sucesso!`)
      }

      this.grid?.clearSelection();
      await this.loadMonth();

      this.grid?.finishInlineSave();


    } catch (e) {
      this.alertService.error('Erro ao salvar as alterações. Tente novamente.')
    }
  }

  onOpenAddBatch() {
    // if (!this.selectedMonth) return this.showErrorRequired();
    this.showModalAdd = true;
  }

  onOpenCreate() {
    // if (!this.selectedMonth) return this.showErrorRequired();
    this.showModalCreate = true;
  }


  onSelectionChange(selectedItems: LinhaContasMensais[]) {
    let receita = 0;
    let despesa = 0;

    selectedItems.forEach((item) => {
      const val = removeFormatCurrencyBR(item.value);
      const sub = String(item.subCategoryName || '').toLowerCase();
      if (sub === 'receita' || sub === 'receitas') receita += val;
      if (sub === 'despesa' || sub === 'despesas') despesa += val;
    });

    this.selectedTotals = { receita, despesa, saldo: receita - despesa, count: selectedItems.length };
  }


  // get selectedTotals() {
  //   let receita = 0;
  //   let despesa = 0;

  //   const selected = this.sortedRows.filter((r) => this.selectedIds.has(r.id));
  //   selected.forEach((item) => {
  //     const val = removeFormatCurrencyBR(item.value);
  //     const sub = String(item.subCategory || '').toLowerCase();
  //     if (sub === 'receita' || sub === 'receitas') receita += val;
  //     if (sub === 'despesa' || sub === 'despesas') despesa += val;
  //   });

  //   return { receita, despesa, saldo: receita - despesa, count: selected.length };
  // }

}