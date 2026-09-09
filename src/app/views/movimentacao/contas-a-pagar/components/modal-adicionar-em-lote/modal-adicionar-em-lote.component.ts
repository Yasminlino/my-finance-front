import { Component, EventEmitter, Input, OnDestroy, OnInit, Output, ViewChild } from '@angular/core';
import { ExibirCampos, GridColumn, GridColumnOption } from 'src/app/shared/components/data-grid/data-grid.interface';
import { AlertService } from 'src/app/shared/components/alert.service';
import { GridColumnTypeEnum } from 'src/app/shared/components/data-grid/enum/grid-column.enum';
import { DataGridComponent } from 'src/app/shared/components/data-grid/data-grid.component';
import { Subscription } from 'rxjs';
import { AccountDto, ContaService } from 'src/app/core/services/contas.service';
import { ContaMensalService } from 'src/app/core/services/conta-mensal.service';
import { ContaMensal } from 'src/app/core/models/conta-mensal.model';
import { formatCurrencyBR, formatDateVencimento, removeFormatCurrencyBR } from 'src/app/core/utils/mask';

@Component({
  selector: 'app-modal-adicionar-em-lote',
  templateUrl: './modal-adicionar-em-lote.component.html',
  styleUrls: ['./modal-adicionar-em-lote.component.scss'],
})
export class ModalAdicionarEmLoteComponent implements OnInit, OnDestroy {
  @Input() month!: string; // pode ser '2026-01-01' ou Date
  @Output() closed = new EventEmitter<boolean>(); // true = salvou algo, false = cancelou
  @Output() 'reload' = new EventEmitter<any[]>();

  contas: AccountDto[] = [];
  contasMensais: ContaMensal[] = [];
  disabledIds = new Set<number>();
  selectedIds = new Set<number>();

  exibirCampos: ExibirCampos | null = null;
  gridColumns: GridColumn[] = []
  breadcrumb = [{ label: 'Cadastros' }, { label: 'Tipo movimentação' }]

  loading = false;
  saving = false;
  q = '';

  showModalForm = false;
  @ViewChild('grid') grid?: DataGridComponent;
  private sub = new Subscription();
  alertTimer: any;


  constructor(
    private readonly contaService: ContaService,
    private readonly contaMensalService: ContaMensalService,
    private readonly alertService: AlertService,
  ) { }


  async ngOnInit() {
    this.setGridColumns()
    this.setExibirCampos()
    await this.load();
  }

  ngOnDestroy(): void {
    this.sub.unsubscribe();
    if (this.alertTimer) clearTimeout(this.alertTimer);
  }


  private setExibirCampos(): void {
    this.exibirCampos = {
      filter: false,
      sortable: true,
      selected: true,
      paginator: false,
      buttonDeleteAll: false,
      buttonNew: false,
      buttonLock: false,
      buttonPopUp: false,
      buttonEditLine: false,
      buttonDeleteLine: false,
      buttonSaveCancel: false,
    }
  }

  private setGridColumns(): void {

    this.gridColumns = [
      { field: 'name', header: 'NOME DA CONTA', type: GridColumnTypeEnum.Text, width: "40%" }, {
        field: 'parcelaFormatada',
        header: 'PARCELAS',
        type: GridColumnTypeEnum.Text,
        width: "40%",
        formatter: (row: any) => row.ehParcelado ? `${row.parcelaAtual} de ${row.quantidadeParcelas}` : '-'
      },
      {
        field: 'value', header: 'VALOR',
        formatter: (row) => this.money(row.value), type: GridColumnTypeEnum.Money, width: "20%"
      }
    ];
  }

  money(v: any) {
    return formatCurrencyBR(v);
  }

  get selectableAccounts(): AccountDto[] {
    return this.contas.filter(a => !this.disabledIds.has(a.id));
  }

  get allSelected(): boolean {
    const selectable = this.selectableAccounts;
    return selectable.length > 0 && selectable.every(a => this.selectedIds.has(a.id));
  }

  get selectedCount(): number {
    return this.selectedIds.size;
  }

  close(saved = false) {
    this.closed.emit(saved);
  }

  toggleOne(accountId: number) {
    const next = new Set(this.selectedIds);
    if (next.has(accountId)) next.delete(accountId);
    else next.add(accountId);
    this.selectedIds = next;
  }

  toggleAll() {
    if (this.allSelected) {
      this.selectedIds = new Set();
      return;
    }
    this.selectedIds = new Set(this.selectableAccounts.map(a => a.id));
  }

  /** Atualiza `selectedIds` a partir da seleção emitida pelo data-grid. */
  onSelectionChange(selected: any[]): void {
    this.selectedIds = new Set(selected.map(item => item.id));
  }

  private async load() {
    try {
      const [contas, contasMensais] = await Promise.all([
        this.contaService.buscarContasAtivas(),
        this.contaMensalService.BuscarContasMensais(this.month, false),
      ]);

      this.contas = contas ?? [];
      this.contasMensais = contasMensais ?? [];

      // 🔹 Mapa: AccountId -> quantidade de lançamentos no mês
      const mapaLancamentos = new Map<number, number>();

      for (const t of this.contasMensais) {
        if (!t.idAccount) continue;

        const atual = mapaLancamentos.get(t.idAccount) ?? 0;
        mapaLancamentos.set(t.idAccount, atual + 1);
      }

      // 🔹 Set de contas que devem ser desabilitadas
      const desabilitados = new Set<number>();

      for (const conta of this.contas) {
        const totalVencimentos = conta.contaVencimentos?.length ?? 0;
        const totalLancados = mapaLancamentos.get(conta.id) ?? 0;

        // ⚠️ Só desabilita se tiver vencimentos configurados
        if (totalVencimentos > 0 && totalLancados >= totalVencimentos) {
          desabilitados.add(conta.id);
        }
      }

      this.disabledIds = desabilitados;

      // 🔹 Remove da seleção contas que agora estão desabilitadas
      this.selectedIds = new Set(
        [...this.selectedIds].filter(id => !this.disabledIds.has(id))
      );

      // 🔹 Sincroniza a seleção do data-grid com o novo estado de disabledIds
      this.grid?.clearSelection();

    } catch (e) {
      console.error(e);
      this.alertService.error('Erro ao carregar contas cadastradas')
    }
  }

  async handleSave() {
    if (this.selectedIds.size === 0) {
      this.alertService.error('Por favor, selecione ao menos uma conta!')
      return;
    }

    this.saving = true;


    const payloads = this.contas
      .filter(acc => this.selectedIds.has(acc.id))
      .map(acc => ({
        date: formatDateVencimento(this.month, "01"),
        name: acc.name,
        idAccount: acc.id,
        value: removeFormatCurrencyBR(acc.value),
        status: 'PENDENTE',
        ehParcelado: acc.ehParcelado,
        parcelaAtual: acc.ehParcelado ? acc.parcelaAtual : null,
        quantidadeParcelas: acc.ehParcelado ? acc.quantidadeParcelas : null,
      }));

    let successCount = 0;
    let errorCount = 0;

    for (const p of payloads) {
      try {
        const created = await this.contaMensalService.createContaMensal(p);
        // ajuste: se sua API retorna { account: created } como no React:
        // if (created?.account) successCount++; else errorCount++;
        if (created) successCount++;
        else errorCount++;
      } catch {
        errorCount++;
      }
    }

    this.saving = false;

    if (successCount > 0) {
      this.alertService.success(`${successCount} itens adicionados com sucesso!`);
      this.reload.emit();
      this.close(true);
    }

    if (errorCount > 0) {
      this.alertService.error(`${errorCount} itens não foram adicionados!`);
    }
  }
}