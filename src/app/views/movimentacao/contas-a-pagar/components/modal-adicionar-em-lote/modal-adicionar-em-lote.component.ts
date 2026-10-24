import { Component, EventEmitter, Input, OnDestroy, OnInit, Output, ViewChild } from '@angular/core';
import { GridColumn } from 'src/app/shared/components/data-grid/data-grid.interface';
import { AlertService } from 'src/app/shared/components/alert.service';
import { GridColumnTypeEnum } from 'src/app/shared/components/data-grid/enum/grid-column.enum';
import { DataGridComponent } from 'src/app/shared/components/data-grid/data-grid.component';
import { Subscription } from 'rxjs';
import { ContaService } from 'src/app/core/services/contas.service';
import { ContaMensalService } from 'src/app/core/services/conta-mensal.service';
import { LinhaContasMensais } from 'src/app/core/models/conta-mensal.model';
import { formatCurrencyBR, formatDateVencimento, parseCurrencyBR } from 'src/app/core/utils/mask';
import { ExibirCamposConfig } from 'src/app/shared/models/utils/grid-config.constants';
import { ContaDto } from 'src/app/core/models/conta.model';
import { catchError, concatMap, finalize, forkJoin, from, map, of, toArray } from 'rxjs';
import { extrairMensagemErro } from 'src/app/core/utils/http-error';

@Component({
  selector: 'app-modal-adicionar-em-lote',
  templateUrl: './modal-adicionar-em-lote.component.html',
})
export class ModalAdicionarEmLoteComponent implements OnInit, OnDestroy {
  @Input() month!: string; // pode ser '2026-01-01' ou Date
  @Output() closed = new EventEmitter<boolean>(); // true = salvou algo, false = cancelou
  @Output() 'reload' = new EventEmitter<void>();

  contas: ContaDto[] = [];
  contasMensais: LinhaContasMensais[] = [];
  disabledIds = new Set<number>();
  selectedIds = new Set<number>();

  exibirCampos: ExibirCamposConfig | null = null;
  gridColumns: GridColumn<ContaDto>[] = []
  breadcrumb = [{ label: 'Cadastros' }, { label: 'Tipo movimentação' }]

  loading = false;
  saving = false;

  showModalForm = false;
  @ViewChild('grid') grid?: DataGridComponent<ContaDto>;
  private sub = new Subscription();


  constructor(
    private readonly contaService: ContaService,
    private readonly contaMensalService: ContaMensalService,
    private readonly alertService: AlertService,
  ) { }


  ngOnInit() {
    this.setGridColumns()
    this.setExibirCampos()
    this.load();
  }

  ngOnDestroy(): void {
    this.sub.unsubscribe();
  }


  private setExibirCampos(): void {
    this.exibirCampos = {
      sortable: true,
      selected: true
    }
  }

  private setGridColumns(): void {

    this.gridColumns = [
      { field: 'nome', header: 'NOME DA CONTA', type: GridColumnTypeEnum.Text, width: "40%" }, {
        field: 'parcelaAtual',
        header: 'PARCELAS',
        type: GridColumnTypeEnum.Text,
        width: "40%",
        formatter: (row: ContaDto) => row.ehParcelado ? `${row.parcelaAtual} de ${row.quantidadeParcelas}` : '-'
      },
      {
        field: 'valor', header: 'VALOR',
        formatter: (row) => this.money(row.valor), type: GridColumnTypeEnum.Money, width: "20%"
      }
    ];
  }

  money(v: unknown) {
    return formatCurrencyBR(v);
  }

  get selectableAccounts(): ContaDto[] {
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
  onSelectionChange(selected: ContaDto[]): void {
    this.selectedIds = new Set(selected.map(item => item.id));
  }

  private load() {
    forkJoin({
      contas: this.contaService.listarAtivas(),
      contasMensais: this.contaMensalService.listarDoMes(this.month, false),
    }).subscribe({
      next: ({ contas, contasMensais }) => {
        this.contas = contas ?? [];
        this.contasMensais = contasMensais ?? [];

        // ContaId -> quantidade de lançamentos no mês
        const mapaLancamentos = new Map<number, number>();
        for (const t of this.contasMensais) {
          if (!t.contaId) continue;
          mapaLancamentos.set(t.contaId, (mapaLancamentos.get(t.contaId) ?? 0) + 1);
        }

        // Desabilita só as contas com vencimentos configurados e todos já lançados.
        const desabilitados = new Set<number>();
        for (const conta of this.contas) {
          const totalVencimentos = conta.vencimentos?.length ?? 0;
          const totalLancados = mapaLancamentos.get(conta.id) ?? 0;
          if (totalVencimentos > 0 && totalLancados >= totalVencimentos) {
            desabilitados.add(conta.id);
          }
        }
        this.disabledIds = desabilitados;

        // Tira da seleção as que ficaram desabilitadas e sincroniza o data-grid.
        this.selectedIds = new Set([...this.selectedIds].filter(id => !this.disabledIds.has(id)));
        this.grid?.clearSelection();
      },
      error: e => this.alertService.error(extrairMensagemErro(e, 'Erro ao carregar contas cadastradas'))
    });
  }

  handleSave() {
    if (this.selectedIds.size === 0) {
      this.alertService.error('Por favor, selecione ao menos uma conta!')
      return;
    }

    const payloads = this.contas
      .filter(acc => this.selectedIds.has(acc.id))
      .map(acc => ({
        data: formatDateVencimento(this.month, "01"),
        nome: acc.nome,
        contaId: acc.id,
        valor: parseCurrencyBR(acc.valor) ?? 0,
        situacao: 'PENDENTE',
        ehParcelado: acc.ehParcelado,
        parcelaAtual: acc.ehParcelado ? acc.parcelaAtual : null,
        quantidadeParcelas: acc.ehParcelado ? acc.quantidadeParcelas : null,
      }));

    this.saving = true;
    // Uma por vez; uma falha não interrompe as demais.
    from(payloads).pipe(
      concatMap(p => this.contaMensalService.criar(p).pipe(map(() => true), catchError(() => of(false)))),
      toArray(),
      finalize(() => (this.saving = false))
    ).subscribe(resultados => {
      const successCount = resultados.filter(Boolean).length;
      const errorCount = resultados.length - successCount;

      if (successCount > 0) {
        this.alertService.success(`${successCount} itens adicionados com sucesso!`);
        this.reload.emit();
        this.close(true);
      }
      if (errorCount > 0) {
        this.alertService.error(`${errorCount} itens não foram adicionados!`);
      }
    });
  }
}