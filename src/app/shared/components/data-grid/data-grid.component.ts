import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  EventEmitter,
  Input,
  OnChanges,
  Output,
  SimpleChanges,
  ViewChild,
  inject
} from '@angular/core';

import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { Table, TableModule } from 'primeng/table';
import { InputTextModule } from 'primeng/inputtext';
import { DropdownModule } from 'primeng/dropdown';
import { CheckboxModule } from 'primeng/checkbox';
import { MultiSelectModule } from 'primeng/multiselect';
import { InputNumberModule } from 'primeng/inputnumber';
import { ButtonModule } from 'primeng/button';
import { CalendarModule } from 'primeng/calendar';
import { FileUploadModule } from 'primeng/fileupload';
import { ToolbarModule } from 'primeng/toolbar';
import { RippleModule } from 'primeng/ripple';
import { TagModule } from 'primeng/tag';
import { BreadcrumbModule } from 'primeng/breadcrumb';
import { DialogModule } from 'primeng/dialog';
import { InputTextareaModule } from 'primeng/inputtextarea';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { MenuModule } from 'primeng/menu';
import { ToggleButtonModule } from 'primeng/togglebutton';

import { MenuItem } from 'primeng/api';
import { ConfirmacaoService } from 'src/app/core/services/confirmacao.service';

import {
  GridColumn, GridColumnOption, GridColumnType, GridLinhaMeta, GridRowChange, LinhaGrid, TypeGrid
} from './data-grid.interface';

import { CurrencyInputDirective } from '../../directives/currency-input.directive';
import { ExibirCamposConfig } from '../../models/utils/grid-config.constants';
import { TagStatus } from '../../enums/status.enum';
import { toDate } from 'src/app/core/utils/mask';


@Component({
  selector: 'app-data-grid',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    TableModule,
    InputTextModule,
    DropdownModule,
    CheckboxModule,
    MultiSelectModule,
    InputNumberModule,
    ButtonModule,
    CalendarModule,
    FileUploadModule,
    ToolbarModule,
    RippleModule,
    TagModule,
    BreadcrumbModule,
    InputTextareaModule,
    DialogModule,
    CurrencyInputDirective,
    ProgressSpinnerModule,
    MenuModule,
    ToggleButtonModule
  ],
  templateUrl: './data-grid.component.html',
  styleUrl: './data-grid.component.scss',
  // O tema do grid (data-grid.theme.scss, global) tem escopo nesta classe.
  host: { class: 'dg' },
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DataGridComponent<T extends object> implements OnChanges {

  /**
   * OnPush (FE-P2-09): o grid só redesenha quando muda um @Input ou quando há evento no próprio
   * template. Os métodos públicos que as telas chamam via @ViewChild marcam a view com o cdr.
   *
   * Genérico no tipo da linha (card #26): a tela passa `T[]` e `GridColumn<T>[]` e recebe `T` nas saídas.
   * Por dentro a linha é uma LinhaGrid (lida e gravada pelo nome da coluna); comoLinha/comoT fazem a ponte.
   */
  private readonly confirmacao = inject(ConfirmacaoService);

  constructor(private readonly cdr: ChangeDetectorRef) {}

  // ---------------------------------------------------------------------------
  // Inputs
  // ---------------------------------------------------------------------------

  @Input() titulo = '';
  /** Linhas a exibir. As telas trocam o array (nunca o alteram no lugar) para o grid remontar. */
  @Input() dataSource: T[] = [];
  @Input() columns: GridColumn<T>[] = [];
  @Input() breadcrumb?: null | MenuItem[] = null;
  @Input() dataKey = 'id';
  @Input() tipoTabela: TypeGrid = TypeGrid.editaModal;
  @Input() dateFilter: Date | undefined;
  @Input() loading = false;
  @Input() itemsButtom: MenuItem[] = [];
  @Input() statusOptions: GridColumnOption[] = [];
  /** Campo da linha que vira tag colorida pelo statusOptions (DB-P3: "ativo" nos cadastros, "situacao" nos itens). */
  @Input() campoStatus = 'status';
  @Input() exibeCampos: ExibirCamposConfig | null = null;
  @Input() disabledRowIds?: Set<unknown>;
  /**
   * Regra de negócio de quem usa o grid: a linha que devolve true não entra na edição inline
   * (ex.: conta paga em Contas a Pagar). Antes o grid fixava `status === 'PAGO'` (FE-P2-04).
   */
  @Input() bloquearLinha?: (linha: T) => boolean;
  /** Chave do localStorage onde o mês do filtro fica guardado (padrão: "dataFiltro"). */
  @Input() localStorage?: string;

  // ---------------------------------------------------------------------------
  // Outputs
  // ---------------------------------------------------------------------------

  @Output() new = new EventEmitter<void>();
  @Output() edit = new EventEmitter<T>();
  @Output() view = new EventEmitter<T>();
  @Output() checkbox = new EventEmitter<T>();
  @Output() delete = new EventEmitter<T>();
  @Output() activate = new EventEmitter<T>();
  @Output() deactivate = new EventEmitter<T>();
  @Output() saveInline = new EventEmitter<GridRowChange<T>[]>();
  @Output() deleteSelected = new EventEmitter<T[]>();
  @Output() saveSelected = new EventEmitter<T[]>();
  @Output() addBatch = new EventEmitter<void>();
  @Output() selectionChange = new EventEmitter<T[]>();
  /** Mês escolhido no calendário do grid (ou nada, no "Atualizar"). */
  @Output() reload = new EventEmitter<Date | undefined>();

  // ---------------------------------------------------------------------------
  // ViewChild
  // ---------------------------------------------------------------------------

  @ViewChild('dt')
  dt?: Table;

  // ---------------------------------------------------------------------------
  // Template helpers
  // ---------------------------------------------------------------------------

  home: MenuItem = {
    icon: 'pi pi-home',
    routerLink: '/'
  };

  // ---------------------------------------------------------------------------
  // Estado
  // ---------------------------------------------------------------------------

  editandoTabela = false;

  deletingId: number | null = null;
  /** Exclusão em lote em andamento: liga ao emitir deleteSelected, desliga em concluirExclusao(). */
  deleting = false;

  tableRows: LinhaGrid[] = [];
  selectedItems: LinhaGrid[] = [];

  activeRows: Set<unknown> = new Set();

  // ---------------------------------------------------------------------------
  // Dialog - Textarea
  // ---------------------------------------------------------------------------

  dialogVisible = false;
  dialogRow: LinhaGrid | null = null;
  dialogColumn: GridColumn<T> | null = null;
  dialogValue = '';

  viewDialogVisible = false;
  viewDialogValue = '';
  viewDialogTitle = '';

  // ---------------------------------------------------------------------------

  // ---------------------------------------------------------------------------

  originalRows = new Map<unknown, LinhaGrid>();

  pendingChanges = new Map<unknown, GridRowChange<T>>();
  filtroValores: Record<string, unknown> = {};
  // ---------------------------------------------------------------------------
  // Filtros
  // ---------------------------------------------------------------------------

  get globalFilterFields(): string[] {
    const fields = this.columns
      .filter(column => column.type !== 'actions')
      .map(column => column.field);

    const formattedFields = this.columns
      .filter(column => typeof column.formatter === 'function')
      .map(column => `__dg_${column.field}`);

    return [...fields, ...formattedFields];
  }

  // ---------------------------------------------------------------------------
  // Data source
  // ---------------------------------------------------------------------------

  /**
   * Monta as linhas quando chegam dados, colunas ou o que muda a exibição — em qualquer ordem.
   * Antes a conversão de data ficava no setter de `dataSource` e lia `this.columns`: só funcionava
   * porque as telas passavam [dataSource] antes de [columns] (FE-P2-06).
   */
  ngOnChanges(changes: SimpleChanges): void {
    if (changes['dataSource'] || changes['columns'] || changes['statusOptions'] || changes['campoStatus'] || changes['disabledRowIds'] || changes['bloquearLinha']) {
      this.montarLinhas();
    }
  }

  private montarLinhas(): void {
    const colunasData = this.columns.filter(column => column.type === 'date');

    this.tableRows = (this.dataSource ?? []).map(row => {
      const linha = this.comoLinha(row);
      colunasData.forEach(column => {
        // "YYYY-MM-DD" (DateOnly) vira meia-noite local, não UTC — ver toDate().
        const valor = linha[column.field];
        if (valor && typeof valor === 'string') {
          linha[column.field] = toDate(valor);
        }
      });
      this.calcularExibicao(linha);
      return linha;
    });
  }

  /** Cópia da linha da tela, para o grid converter datas e guardar `__dg` sem mexer no original. */
  private comoLinha(row: T): LinhaGrid {
    return { ...row } as unknown as LinhaGrid;
  }

  /** A linha do grid devolvida à tela (saídas, formatter, bloquearLinha): os campos de T continuam nela. */
  private comoT(linha: LinhaGrid): T {
    return linha as unknown as T;
  }

  /** Recalcula `linha.__dg` (ver GridLinhaMeta) e os campos `__dg_<campo>` da busca global. */
  private calcularExibicao(linha: LinhaGrid): void {
    const meta: GridLinhaMeta = {
      texto: {},
      classe: {},
      severidade: this.getSeverityStatus(linha[this.campoStatus]),
      desabilitada: this.isRowDisabled(linha),
      bloqueada: this.bloquearLinha?.(this.comoT(linha)) === true
    };

    this.columns.forEach(column => {
      if (column.type === 'actions') return;

      if (typeof column.formatter === 'function') {
        let formatado: unknown;
        try {
          formatado = column.formatter(this.comoT(linha));
        } catch {
          formatado = '';
        }
        meta.texto[column.field] = formatado;
        linha[`__dg_${column.field}`] = formatado == null ? '' : String(formatado);
      } else if (column.type === 'select') {
        meta.texto[column.field] = this.getSelectLabel(column, linha[column.field]);
      } else {
        meta.texto[column.field] = linha[column.field];
      }

      meta.classe[column.field] = this.getColumnClass(column, linha);
    });

    linha.__dg = meta;
  }

  rowKey(row: LinhaGrid): unknown {
    return row?.[this.dataKey];
  }

  // ---------------------------------------------------------------------------
  // Disabled rows
  // ---------------------------------------------------------------------------

  /** Linha marcada pelo componente pai como `somenteLeitura: true` (ex.: tipo de cartão padrão do sistema). */
  isSomenteLeitura(row: LinhaGrid): boolean {
    return row?.['somenteLeitura'] === true;
  }

  /**
   * Returns true when the row must be rendered as disabled / non-selectable:
   * read-only rows, or rows whose dataKey value is present in the
   * `disabledRowIds` set provided by the host component.
   */
  isRowDisabled(row: LinhaGrid): boolean {
    if (this.isSomenteLeitura(row)) {
      return true;
    }

    if (!this.disabledRowIds || this.disabledRowIds.size === 0) {
      return false;
    }

    const key = this.rowKey(row);
    return key !== undefined && this.disabledRowIds.has(key);
  }

  /**
   * PrimeNG `p-table` `rowSelectable` callback.
   * Returning `false` prevents the row from being added to (or removed from)
   * the selection — both when the user clicks the row checkbox and when the
   * header "select all" checkbox is toggled.
   */
  readonly rowSelectableFn = ({ data }: { data: LinhaGrid; index: number }): boolean =>
    !this.isRowDisabled(data);

  // ---------------------------------------------------------------------------
  // Textarea
  // ---------------------------------------------------------------------------

  openTextAreaDialog(
    row: LinhaGrid,
    column: GridColumn<T>
  ): void {
    this.dialogRow = row;
    this.dialogColumn = column;
    this.dialogValue = this.textoDe(row[column.field]);

    this.dialogVisible = true;
  }

  saveTextAreaDialog(): void {
    if (!this.dialogRow || !this.dialogColumn) {
      return;
    }

    this.dialogRow[this.dialogColumn.field] = this.dialogValue;

    this.onCellChange(this.dialogRow);

    this.closeTextAreaDialog();
  }

  closeTextAreaDialog(): void {
    this.dialogVisible = false;
    this.dialogRow = null;
    this.dialogColumn = null;
    this.dialogValue = '';
  }

  openTextAreaViewDialog(
    row: LinhaGrid,
    column: GridColumn<T>
  ): void {
    this.viewDialogValue = this.textoDe(row[column.field]);
    this.viewDialogTitle = column.header;
    this.viewDialogVisible = true;
  }

  closeTextAreaViewDialog(): void {
    this.viewDialogVisible = false;
    this.viewDialogValue = '';
    this.viewDialogTitle = '';
  }

  /** Texto do diálogo de texto longo: vazio quando a célula não tem valor. */
  private textoDe(valor: unknown): string {
    return valor == null ? '' : String(valor);
  }

  // ---------------------------------------------------------------------------
  // Ações
  // ---------------------------------------------------------------------------

  colActions(column: GridColumn<T>): string[] {
    return column.functions?.length
      ? column.functions
      : ['edit', 'delete'];
  }

  onEditClick(row: LinhaGrid, _column: GridColumn<T>): void {
    this.edit.emit(this.comoT(row));
  }

  onViewClick(row: LinhaGrid, _column: GridColumn<T>): void {
    this.view.emit(this.comoT(row));
  }

  onCheckBoxClick(row: LinhaGrid): void {
    this.checkbox.emit(this.comoT(row));
  }

  onDelete(row: LinhaGrid): void {
    this.delete.emit(this.comoT(row));
  }

  openNew(): void {
    this.new.emit();
  }

  onOpenAddBatch(): void {
    this.addBatch.emit();
  }

  // ---------------------------------------------------------------------------
  // ---------------------------------------------------------------------------

  /** Rótulo da opção cujo value é o valor da célula; sem opção correspondente, o próprio valor. */
  getSelectLabel(col: GridColumn<T>, value: unknown): unknown {
    if (!col.options || value === null || value === undefined) {
      return value ?? '-';
    }
    const option = col.options.find(opt => opt.value === value);
    return option ? option.label : value;
  }

  get pendingCount(): number {
    return this.pendingChanges.size;
  }

  toggleEdicaoTabela(): void {
    if (this.editandoTabela) {
      this.disableEditMode();
    } else {
      this.enableEditMode();
    }
  }

  private enableEditMode(): void {
    this.editandoTabela = true;

    const editingRowKeys: Record<string, boolean> = {};

    this.tableRows.forEach(row => {
      const key = this.rowKey(row);

      if (key === undefined) {
        return;
      }

      if (row.__dg?.bloqueada) {
        return;
      }

      editingRowKeys[String(key)] = true;

      if (!this.originalRows.has(key)) {
        this.originalRows.set(
          key,
          this.cloneRow(row)
        );
      }
    });

    if (this.dt) {
      this.dt.editingRowKeys = editingRowKeys;
    }
    this.cdr.markForCheck();
  }

  private disableEditMode(): void {
    this.editandoTabela = false;

    if (this.dt) {
      this.dt.editingRowKeys = {};
    }
    this.cdr.markForCheck();
  }

  private cloneRow(row: LinhaGrid): LinhaGrid {
    const clone: LinhaGrid = { ...row };

    this.columns.forEach(column => {
      clone[column.field] =
        this.cloneValue(row[column.field]);
    });

    return clone;
  }

  isRowChanged(row: LinhaGrid): boolean {
    const key = this.rowKey(row);

    if (key === undefined) {
      return false;
    }

    const original = this.originalRows.get(key);

    if (!original) {
      return false;
    }

    return this.editableColumns().some(column =>
      !this.valuesEqual(
        original[column.field],
        row[column.field]
      )
    );
  }

  isInlineEditable(column: GridColumn<T>): boolean {
    if (
      column.field === 'actions' ||
      column.editable === false
    ) {
      return false;
    }

    return [
      undefined,
      'text',
      'text-area',
      'select',
      'multiselect',
      'number',
      'money',
      'date',
      'boolean'
    ].includes(column.type);
  }

  editableColumns(): GridColumn<T>[] {
    return this.columns.filter(column =>
      this.isInlineEditable(column)
    );
  }

  onCellChange(row: LinhaGrid): void {
    // O ngModel já alterou a linha: o texto exibido acompanha o novo valor.
    this.calcularExibicao(row);

    const key = this.rowKey(row);

    if (key === undefined) {
      return;
    }

    const original = this.originalRows.get(key);

    if (!original) {
      return;
    }

    const changes: Record<string, unknown> = {};

    this.editableColumns().forEach(column => {
      const currentValue = this.normalizeComparableValue(
        row[column.field]
      );

      const originalValue = this.normalizeComparableValue(
        original[column.field]
      );

      // Se for select ou qualquer campo editável, garante que capturamos a mudança
      if (!this.valuesEqual(originalValue, currentValue)) {
        changes[column.field] = row[column.field]; // Mantém o valor cru real (objeto, string ou número)
      }
    });

    // Se não houver nenhuma mudança real detectada, remove dos pendentes
    if (Object.keys(changes).length === 0) {
      this.pendingChanges.delete(key);
      return;
    }

    this.pendingChanges.set(key, {
      row: this.comoT(row),
      // Só campos editáveis de colunas da tela, ou seja, campos de T.
      changes: changes as Partial<T>
    });
  }

  revertRow(row: LinhaGrid): void {
    const key = this.rowKey(row);

    if (key === undefined) {
      return;
    }

    const original = this.originalRows.get(key);

    if (!original) {
      return;
    }

    this.editableColumns().forEach(column => {
      row[column.field] =
        this.cloneValue(
          original[column.field]
        );
    });
    this.calcularExibicao(row);

    this.pendingChanges.delete(key);
  }

  async onSaveAll(): Promise<void> {
    if (this.pendingCount === 0) {
      return;
    }

    const changes = Array.from(
      this.pendingChanges.values()
    );

    this.saveInline.emit(changes);
  }

  public finishInlineSave(): void {
    this.pendingChanges.clear();
    this.originalRows.clear();

    this.editandoTabela = false;

    if (this.dt) {
      this.dt.editingRowKeys = {};
    }
    this.cdr.markForCheck();
  }

  async cancelarTodasAlteracoes(): Promise<void> {
    if (this.pendingCount === 0) {
      this.disableEditMode();
      return;
    }

    const confirmed = await this.confirmacao.confirmar(
      'Tem certeza que deseja desfazer todas as alterações?',
      { titulo: 'Desfazer alterações', aceitar: 'Desfazer' }
    );

    if (!confirmed) {
      return;
    }

    this.clearAllPendingChanges();
    this.disableEditMode();
  }

  clearAllPendingChanges(): void {
    this.pendingChanges.forEach((_, key) => {
      const row = this.tableRows.find(
        item => this.rowKey(item) === key
      );

      const original = this.originalRows.get(key);

      if (!row || !original) {
        return;
      }

      this.editableColumns().forEach(column => {
        row[column.field] =
          this.cloneValue(
            original[column.field]
          );
      });
      this.calcularExibicao(row);
    });

    this.pendingChanges.clear();
    this.originalRows.clear();
    this.cdr.markForCheck();
  }

  public clearPendingChanges(): void {
    this.pendingChanges.clear();
    this.originalRows.clear();
    this.cdr.markForCheck();
  }

  private cloneValue(value: unknown): unknown {
    if (value instanceof Date) {
      return new Date(value.getTime());
    }

    if (Array.isArray(value)) {
      return [...value];
    }

    if (
      value &&
      typeof value === 'object'
    ) {
      return { ...value };
    }

    return value;
  }

  private normalizeComparableValue(value: unknown): unknown {
    if (value instanceof Date) {
      return new Date(
        value.getFullYear(),
        value.getMonth(),
        value.getDate()
      ).toISOString();
    }

    if (typeof value === 'string') {
      const trimmed = value.trim();

      if (!trimmed) {
        return '';
      }

      const isoDate = new Date(trimmed);

      if (
        !isNaN(isoDate.getTime()) &&
        /^\d{4}-\d{2}-\d{2}T/.test(trimmed)
      ) {
        return new Date(
          isoDate.getFullYear(),
          isoDate.getMonth(),
          isoDate.getDate()
        ).toISOString();
      }

      return trimmed;
    }

    return value;
  }

  protected valuesEqual(
    a: unknown,
    b: unknown
  ): boolean {
    if (a === b) {
      return true;
    }

    if (a == null || b == null) {
      return a == null && b == null;
    }

    const normalizedA =
      this.normalizeComparableValue(a);

    const normalizedB =
      this.normalizeComparableValue(b);

    return normalizedA === normalizedB;
  }

  // ---------------------------------------------------------------------------
  // Status
  // ---------------------------------------------------------------------------

  getSeverityStatus(
    statusValue: unknown
  ): TagStatus {
    const option =
      this.statusOptions.find(
        item => item.value === statusValue
      );

    return option?.classe ?? TagStatus.Info;
  }

  // ---------------------------------------------------------------------------
  // Seleção
  // ---------------------------------------------------------------------------

  onDeleteSelected(): void {
    if (!this.selectedItems.length) {
      return;
    }

    this.deleting = true;

    this.deleteSelected.emit(
      this.selectedItems.map(linha => this.comoT(linha))
    );
  }

  clearSelection(): void {
    this.selectedItems = [];

    this.selectionChange.emit([]);
    this.cdr.markForCheck();
  }

  /**
   * Fim da exclusão em lote (chamado pelo ExclusaoEmLoteService): libera o botão e, se excluiu,
   * limpa a seleção. Cancelada, a seleção fica como estava (FE-P2-05).
   */
  concluirExclusao(excluiu: boolean): void {
    this.deleting = false;
    if (excluiu) {
      this.clearSelection();
    }
    this.cdr.markForCheck();
  }

  // ---------------------------------------------------------------------------
  // Filtros
  // ---------------------------------------------------------------------------

  defaultMatchMode(type?: GridColumnType): string {
    switch (type) {
      case 'select':
      case 'multiselect':
        return 'in';
      case 'number':
        return 'equals';
      case 'date':
        return 'dateIs';
      case 'boolean':
        return 'equals';
      default:
        return 'contains';
    }
  }

  matchMode(
    column: GridColumn<T>
  ): string {
    return (
      column.filterMatchMode ??
      this.defaultMatchMode(column.type)
    );
  }

  onFilter(
    event: Event,
    column: GridColumn<T>,
    table: Table
  ): void {
    const value =
      (event.target as HTMLInputElement)?.value;

    table.filter(
      value,
      column.field,
      this.matchMode(column)
    );
  }

  /** Filtro de select, multiselect e número: os três eventos do PrimeNG trazem o valor em `value`. */
  onValueFilter(
    event: { value?: unknown } | null,
    column: GridColumn<T>,
    table: Table
  ): void {
    table.filter(
      event?.value ?? null,
      column.field,
      this.matchMode(column)
    );
  }

  onBooleanFilter(
    event: { checked?: boolean } | null,
    column: GridColumn<T>,
    table: Table
  ): void {
    const value =
      event?.checked ? true : null;

    table.filter(
      value,
      column.field,
      this.matchMode(column)
    );
  }

  /**
   * As colunas de data guardam Date na linha (montarLinhas). O filtro manda o Date do calendário
   * com o matchMode da coluna ('dateIs': mesmo dia). Antes ia o texto "YYYY-MM-DD" com 'equals',
   * que o PrimeNG compara com Date.toString() e nunca casava (FE-P3-04).
   */
  onDateFilter(event: Date | null, column: GridColumn<T>, table: Table): void {
    table.filter(event, column.field, this.matchMode(column));
  }

  clear(table: Table): void {
    table.clear();
    this.filtroValores = {}; // Zera todos os modelos de uma vez só!
  }

  // ---------------------------------------------------------------------------
  // Calendário / período
  // ---------------------------------------------------------------------------

  onLoadMonth(event: Date | undefined): void {
    if (event) {
      this.dateFilter = event;

      localStorage.setItem(
        this.localStorage ?? 'dataFiltro',
        event.toISOString()
      );
    }

    this.reload.emit(event);
  }

  goBack(): void {
    window.history.back();
  }
  
  load(): void {
    this.reload.emit();
  }

  // ---------------------------------------------------------------------------
  // Exportação
  // ---------------------------------------------------------------------------

  onExport(): void {
    if (!this.dt) {
      return;
    }

    try {
      this.dt.exportCSV();
    } catch (error) {
      console.warn(
        'PrimeNG exportCSV falhou. Usando fallback.',
        error
      );

      this.exportFallback();
    }
  }

  private exportFallback(): void {
    // Filtrado: as linhas do grid; sem filtro: as da tela. As duas têm os campos de T.
    const rows: T[] =
      (this.dt?.filteredValue as T[] | null | undefined) ??
      this.dataSource ??
      [];

    const exportColumns =
      this.columns.filter(
        column => column.type !== 'actions'
      );

    const headers =
      exportColumns.map(
        column => column.header ?? column.field
      );

    const csvRows: string[] = [];

    csvRows.push(
      headers
        .map(value =>
          `"${String(value).replace(/"/g, '""')}"`
        )
        .join(',')
    );

    rows.forEach(row => {
      const values =
        exportColumns.map(column => {
          const rawValue =
            column.formatter
              ? column.formatter(row)
              : this.comoLinha(row)[column.field];

          const value =
            rawValue == null
              ? ''
              : String(rawValue);

          return `"${value.replace(/"/g, '""')}"`;
        });

      csvRows.push(values.join(','));
    });

    const csv =
      csvRows.join('\r\n');

    const blob = new Blob(
      [csv],
      {
        type: 'text/csv;charset=utf-8;'
      }
    );

    const link =
      document.createElement('a');

    const url =
      URL.createObjectURL(blob);

    link.href = url;

    link.download =
      `${this.titulo || 'export'}.csv`;

    document.body.appendChild(link);

    link.click();

    document.body.removeChild(link);

    URL.revokeObjectURL(url);
  }

  getColumnClass(col: GridColumn<T>, linha: LinhaGrid): string {
    if (!col.classe) {
      return '';
    }
    // Se a classe for uma função (ex: para o valor positivo/negativo), executa-a passando a linha
    if (typeof col.classe === 'function') {
      return col.classe(this.comoT(linha));
    }
    // Se for apenas uma string normal (ex: 'p-tag-danger')
    return col.classe;
  }
}