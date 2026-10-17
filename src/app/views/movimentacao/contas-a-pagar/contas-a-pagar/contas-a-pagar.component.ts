import { Component, DestroyRef, OnInit, ViewChild, inject } from '@angular/core';
import { FormBuilder } from '@angular/forms';
import { LinhaContasMensais } from 'src/app/core/models/conta-mensal.model';
import { formatCurrencyBR, formatDateBR, formatDateInput, formatYearMonth } from 'src/app/core/utils/mask';
import { DataGridComponent } from 'src/app/shared/components/data-grid/data-grid.component';
import { GridColumn, TypeGrid, GridRowChange, GridColumnOption } from "src/app/shared/components/data-grid/data-grid.interface"
import { ContaMensalService } from 'src/app/core/services/conta-mensal.service';
import { CategoryService } from 'src/app/core/services/category.service';
import { GridColumnTypeEnum } from 'src/app/shared/components/data-grid/enum/grid-column.enum';
import { MenuItem } from 'primeng/api';
import { AlertService } from 'src/app/shared/components/alert.service';
import { ExclusaoEmLoteService } from 'src/app/core/services/exclusao-em-lote.service';
import { extrairMensagemErro } from 'src/app/core/utils/http-error';
import { STATUS_PAGAMENTO_OPTIONS, contaPaga } from 'src/app/shared/enums/status.enum';
import { calcularTotaisSelecao, naturezaPorSubCategoria } from 'src/app/shared/utils/totais-selecao';
import { EXIBIR_CAMPOS_MOVIMENTACOES, ExibirCamposConfig } from 'src/app/shared/models/utils/grid-config.constants';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Subject, concat, finalize, toArray } from 'rxjs';
import { ultimaBusca } from 'src/app/shared/utils/ultima-busca';

@Component({
  selector: 'app-contas-a-pagar',
  templateUrl: './contas-a-pagar.component.html',
  styleUrls: ['./contas-a-pagar.component.scss']
})
export class ContasAPagarComponent implements OnInit {
  @ViewChild('grid') grid?: DataGridComponent;
  private readonly destroyRef = inject(DestroyRef);
  /** Mês pedido ("YYYY-MM"); a carga segue sempre o último. */
  private readonly mes$ = new Subject<string>();
  breadcrumb = [{ label: 'Movimentações' }, { label: 'Contas a Pagar' }]
  titulo = 'Contas a Pagar'
  tipoTabela = TypeGrid.editaLinha
  contasMensais: LinhaContasMensais[] = [];
  dateFilter: Date | undefined
  categorias: GridColumnOption[] = [];
  gridColumns: GridColumn[] = [];
  itemsButtom: MenuItem[] = [];

  showModalForm = false;
  editing: LinhaContasMensais | null = null;

  statusOptions = STATUS_PAGAMENTO_OPTIONS;
  /** Conta paga não é editada na grade (FE-P2-04); para corrigir, exclui e adiciona de novo. */
  readonly contaPaga = contaPaga;

  showModalAdd: boolean = false;
  deletingId: number | null = null;
  selectedMonth: any;
  loading: boolean = false;
  selectedTotals = { receita: 0, despesa: 0, saldo: 0, count: 0 };
  
  exibirCampos: ExibirCamposConfig = { ...EXIBIR_CAMPOS_MOVIMENTACOES };

  showModalCreate: boolean = false;


  categoriaOptions: string[] = [];

  money(v: any) { return formatCurrencyBR(v); }
  dateInput(v: any) { return formatDateInput(v); }


  constructor(private fb: FormBuilder, private contaMensalService: ContaMensalService, private readonly categoryService: CategoryService, private readonly alertService: AlertService, private readonly exclusaoEmLote: ExclusaoEmLoteService) { }

  private getCurrentYearMonth(): string {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  }

  ngOnInit() {
    this.setitemsButtom();

    // Troca de mês: só a resposta do último mês pedido chega à tela (FE-P2-08).
    ultimaBusca(this.mes$, mes => this.contaMensalService.listarDoMes(mes, false), e => {
      this.loading = false;
      this.alertService.error(extrairMensagemErro(e, 'Erro ao carregar as contas do mês.'));
    })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(contas => {
        this.contasMensais = contas;
        this.loading = false;
      });

    this.categoryService.listarAtivas()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: categorias => {
          this.categorias = categorias.map(c => ({ label: c.name, value: c.name }));
          this.setGridColumns();
        },
        error: e => this.alertService.error(extrairMensagemErro(e, 'Erro ao carregar as categorias.'))
      });

    this.loadMonth();
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
        header: "CONTA",
        type: GridColumnTypeEnum.Text,
        width: '15%',
        editable: false
      },
      {
        field: "categoryName",
        header: "CATEGORIA",
        type: GridColumnTypeEnum.Select,
        options: this.categorias,
        width: '12%',
        editable: false
      },
      {
        field: "parcelaAtual",
        header: "PARCELA",
        type: GridColumnTypeEnum.Number,
        width: '8.5%',
        editable: true
      },
      {
        field: "observacao",
        header: "OBSERVAÇÃO",
        type: GridColumnTypeEnum.TextArea,
        width: '13%',
        editable: true
      },
      {
        field: "value",
        header: "VALOR",
        type: GridColumnTypeEnum.Money,
        formatter: (row) => this.money(row.value),
        width: '12%',
        editable: true
      },
      {
        field: "date",
        header: "VENCIMENTO",
        type: GridColumnTypeEnum.Date,
        formatter: (row) =>
          formatDateBR(row.date),
        width: '15%',
        editable: true
      },
      {
        field: "status",
        header: "STATUS",
        type: GridColumnTypeEnum.Select,
        options: this.statusOptions,
        width: '17%',
        editable: true
      },
      {
        field: 'actions',
        header: 'AÇÕES',
        type: GridColumnTypeEnum.Actions,
        functions: ['delete']
      }
    ];
  }




  loadMonth(dataSelecionada?: Date) {
    if (dataSelecionada) {
      this.dateFilter = dataSelecionada;
      localStorage.setItem('dataFiltroContaMensal', dataSelecionada.toISOString());
    } else {
      const ultimoMesSelecionado = localStorage.getItem('dataFiltroContaMensal');
      this.dateFilter = ultimoMesSelecionado ? new Date(ultimoMesSelecionado) : new Date();
    }

    this.selectedMonth = formatYearMonth(this.dateFilter);
    this.loading = true;
    this.mes$.next(this.selectedMonth);
  }



  onEdit(contaMensal: LinhaContasMensais) {
    this.editing = contaMensal;
    this.showModalForm = true;
  }

  onDeleteSelected(rows: LinhaContasMensais[]) {
    this.exclusaoEmLote
      .confirmarEExcluir(this.grid, rows, row => this.contaMensalService.excluir(row.id), { singular: 'conta', plural: 'contas', feminino: true })
      .subscribe(excluiu => {
        if (excluiu) this.loadMonth();
      });
  }



  onDelete(row: LinhaContasMensais) {
    const ok = window.confirm(`Excluir a conta '${row.name}'?`);
    if (!ok) return;

    // Loading na linha até a API responder.
    this.deletingId = row.id;
    this.contaMensalService.excluir(row.id)
      .pipe(finalize(() => (this.deletingId = null)))
      .subscribe({
        next: () => {
          this.alertService.success(`Conta '${row.name}' excluída com sucesso!`);
          this.loadMonth();
        },
        error: e => this.alertService.error(extrairMensagemErro(e, `Falha ao excluir a conta '${row.name}'.`))
      });
  }

  /** Salva em lote as alterações feitas via edição inline ("Salvar tudo"). */
  onSaveInline(changes: GridRowChange[]) {
    if (!changes.length) {
      return;
    }

    // Uma por vez, na ordem; para no primeiro erro, como antes.
    concat(...changes.map(change => this.contaMensalService.atualizar({ ...change.row, ...change.changes })))
      .pipe(toArray())
      .subscribe({
        next: () => {
          this.alertService.success(`${changes.length} alteração(ões) salva(s) com sucesso!`);
          this.grid?.clearSelection();
          this.loadMonth();
          this.grid?.finishInlineSave();
        },
        error: e => this.alertService.error(extrairMensagemErro(e, 'Erro ao salvar as alterações. Tente novamente.'))
      });
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
    this.selectedTotals = calcularTotaisSelecao(
      selectedItems,
      item => item.value,
      item => naturezaPorSubCategoria(item.subCategoryName)
    );
  }

}