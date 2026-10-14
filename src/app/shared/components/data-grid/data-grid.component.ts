import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  EventEmitter,
  Input,
  OnChanges,
  Output,
  SimpleChanges,
  ViewChild
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

import { GridColumn, GridColumnOption, GridColumnType, GridLinhaMeta, GridRowChange, TypeGrid } from './data-grid.interface';

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
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DataGridComponent implements OnChanges {

  /**
   * OnPush (FE-P2-09): o grid só redesenha quando muda um @Input ou quando há evento no próprio
   * template. Os métodos públicos que as telas chamam via @ViewChild marcam a view com o cdr.
   */
  constructor(private readonly cdr: ChangeDetectorRef) {}

  // ---------------------------------------------------------------------------
  // Inputs
  // ---------------------------------------------------------------------------

  @Input() titulo = '';
  /** Linhas a exibir. As telas trocam o array (nunca o alteram no lugar) para o grid remontar. */
  @Input() dataSource: any[] = [];
  @Input() columns: GridColumn[] = [];
  @Input() breadcrumb?: null | MenuItem[] = null;
  @Input() dataKey = 'id';
  @Input() tipoTabela: TypeGrid = TypeGrid.editaModal;
  @Input() dateFilter: Date | undefined;
  @Input() loading = false;
  @Input() itemsButtom: MenuItem[] = [];
  @Input() statusOptions: GridColumnOption[] = [];
  @Input() exibeCampos: ExibirCamposConfig | null = null;
  @Input() disabledRowIds?: Set<any>;
  /**
   * Regra de negócio de quem usa o grid: a linha que devolve true não entra na edição inline
   * (ex.: conta paga em Contas a Pagar). Antes o grid fixava `status === 'PAGO'` (FE-P2-04).
   */
  @Input() bloquearLinha?: (linha: any) => boolean;
  @Input() localStorage?: String;

  // ---------------------------------------------------------------------------
  // Outputs
  // ---------------------------------------------------------------------------

  @Output() new = new EventEmitter<any>();
  @Output() edit = new EventEmitter<any>();
  @Output() view = new EventEmitter<any>();
  @Output() checkbox = new EventEmitter<any>();
  @Output() delete = new EventEmitter<any>();
  @Output() activate = new EventEmitter<any>();
  @Output() deactivate = new EventEmitter<any>();
  @Output() saveInline = new EventEmitter<GridRowChange[]>();
  @Output() deleteSelected = new EventEmitter<any[]>();
  @Output() saveSelected = new EventEmitter<any[]>();
  @Output() addBatch = new EventEmitter<any[]>();
  @Output() selectionChange = new EventEmitter<any[]>();
  @Output() reload = new EventEmitter<any>();

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

  tableRows: any[] = [];
  selectedItems: any[] = [];

  activeRows: Set<any> = new Set();

  // ---------------------------------------------------------------------------
  // Dialog - Textarea
  // ---------------------------------------------------------------------------

  dialogVisible = false;
  dialogRow: any = null;
  dialogColumn: GridColumn | null = null;
  dialogValue = '';

  viewDialogVisible = false;
  viewDialogValue = '';
  viewDialogTitle = '';

  // ---------------------------------------------------------------------------

  // ---------------------------------------------------------------------------

  originalRows = new Map<any, any>();

  pendingChanges = new Map<any, GridRowChange>();
  filtroValores: { [key: string]: any } = {};
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
    if (changes['dataSource'] || changes['columns'] || changes['statusOptions'] || changes['disabledRowIds'] || changes['bloquearLinha']) {
      this.montarLinhas();
    }
  }

  private montarLinhas(): void {
    const colunasData = this.columns.filter(column => column.type === 'date');

    this.tableRows = (this.dataSource ?? []).map(row => {
      const linha = { ...row };
      colunasData.forEach(column => {
        // "YYYY-MM-DD" (DateOnly) vira meia-noite local, não UTC — ver toDate().
        if (linha[column.field] && typeof linha[column.field] === 'string') {
          linha[column.field] = toDate(linha[column.field]);
        }
      });
      this.calcularExibicao(linha);
      return linha;
    });
  }

  /** Recalcula `linha.__dg` (ver GridLinhaMeta) e os campos `__dg_<campo>` da busca global. */
  private calcularExibicao(linha: any): void {
    const meta: GridLinhaMeta = {
      texto: {},
      classe: {},
      severidade: this.getSeverityStatus(linha.status),
      desabilitada: this.isRowDisabled(linha),
      bloqueada: this.bloquearLinha?.(linha) === true
    };

    this.columns.forEach(column => {
      if (column.type === 'actions') return;

      if (typeof column.formatter === 'function') {
        let formatado: any;
        try {
          formatado = column.formatter(linha);
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

  rowKey(row: any): any {
    return row?.[this.dataKey];
  }

  // ---------------------------------------------------------------------------
  // Disabled rows
  // ---------------------------------------------------------------------------

  /**
   * Returns true when the row must be rendered as disabled / non-selectable.
   * A row is considered disabled when its dataKey value is present in the
   * `disabledRowIds` set provided by the host component.
   */
  /** Linha marcada pelo componente pai como `somenteLeitura: true` (ex.: tipo de cartão padrão do sistema). */
  isSomenteLeitura(row: any): boolean {
    return row?.somenteLeitura === true;
  }

  isRowDisabled(row: any): boolean {
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
   * the selection â€” both when the user clicks the row checkbox and when the
   * header "select all" checkbox is toggled.
   */
  readonly rowSelectableFn = ({ data }: { data: any; index: number }): boolean =>
    !this.isRowDisabled(data);

  // ---------------------------------------------------------------------------
  // Textarea
  // ---------------------------------------------------------------------------

  openTextAreaDialog(
    row: any,
    column: GridColumn
  ): void {
    this.dialogRow = row;
    this.dialogColumn = column;
    this.dialogValue = row[column.field] ?? '';

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
    row: any,
    column: GridColumn
  ): void {
    this.viewDialogValue = row[column.field] ?? '';
    this.viewDialogTitle = column.header;
    this.viewDialogVisible = true;
  }

  closeTextAreaViewDialog(): void {
    this.viewDialogVisible = false;
    this.viewDialogValue = '';
    this.viewDialogTitle = '';
  }

  // ---------------------------------------------------------------------------
  // AÃ§Ãµes
  // ---------------------------------------------------------------------------

  colActions(column: GridColumn): string[] {
    return column.functions?.length
      ? column.functions
      : ['edit', 'delete'];
  }

  onEditClick(row: any, _column: GridColumn): void {
    this.edit.emit(row);
  }

  onViewClick(row: any, _column: GridColumn): void {
    this.view.emit(row);
  }

  onCheckBoxClick(row: any): void {
    this.checkbox.emit(row);
  }

  onDelete(row: any): void {
    this.delete.emit(row);
  }

  openNew(): void {
    this.new.emit();
  }

  onOpenAddBatch(): void {
    this.addBatch.emit();
  }

  // ---------------------------------------------------------------------------
  // ---------------------------------------------------------------------------

  getSelectLabel(col: any, value: any): string {
    if (!col.options || value === null || value === undefined) {
      return value ?? '-';
    }
    // Procura na lista de opções aquela cujo 'value' (o ID) seja igual ao valor atual da linha
    const option = col.options.find((opt: any) => opt.value === value);
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

      editingRowKeys[key] = true;

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

  private cloneRow(row: any): any {
    const clone = { ...row };

    this.columns.forEach(column => {
      clone[column.field] =
        this.cloneValue(row[column.field]);
    });

    return clone;
  }

  isRowChanged(row: any): boolean {
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

  isInlineEditable(column: GridColumn): boolean {
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

  editableColumns(): GridColumn[] {
    return this.columns.filter(column =>
      this.isInlineEditable(column)
    );
  }

  onCellChange(row: any): void {
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

    const changes: Record<string, any> = {};

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
      row,
      changes
    });
  }

  revertRow(row: any): void {
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

  cancelarTodasAlteracoes(): void {
    if (this.pendingCount === 0) {
      this.disableEditMode();
      return;
    }

    const confirmed = window.confirm(
      'Tem certeza que deseja desfazer todas as alterações?'
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

  private cloneValue(value: any): any {
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

  private normalizeComparableValue(value: any): any {
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
    a: any,
    b: any
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
    statusValue: string
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

    this.deleteSelected.emit([
      ...this.selectedItems
    ]);
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
        return 'dateIs'; // Garanta que estÃ¡ usando dateIs
      case 'boolean':
        return 'equals';
      default:
        return 'contains';
    }
  }

  matchMode(
    column: GridColumn
  ): string {
    return (
      column.filterMatchMode ??
      this.defaultMatchMode(column.type)
    );
  }

  onFilter(
    event: Event,
    column: GridColumn,
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

  onSelectFilter(
    event: any,
    column: GridColumn,
    table: Table
  ): void {
    table.filter(
      event?.value ?? null,
      column.field,
      this.matchMode(column)
    );
  }

  onMultiSelectFilter(
    event: any,
    column: GridColumn,
    table: Table
  ): void {
    table.filter(
      event?.value ?? null,
      column.field,
      this.matchMode(column)
    );
  }

  onBooleanFilter(
    event: any,
    column: GridColumn,
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

  onNumberFilter(
    event: any,
    column: GridColumn,
    table: Table
  ): void {
    table.filter(
      event?.value ?? null,
      column.field,
      this.matchMode(column)
    );
  }

  onDateFilter(event: any, column: GridColumn, table: Table): void {
    let value = null;

    if (event) {
      const date = new Date(event);
      // Força o formato yyyy-mm-dd para testar se bate certo com os dados da linha
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      value = `${year}-${month}-${day}`;
    }

    // Tente fixar temporariamente 'contains' ou 'equals' para validar
    table.filter(value, column.field, 'equals');
  }

  private toDateOnly(
    date: Date | string
  ): Date {
    const value = new Date(date);

    return new Date(
      value.getFullYear(),
      value.getMonth(),
      value.getDate()
    );
  }

  // Adicione propriedades de controle de filtro se desejar, 
  // ou atualize o método clear para resetar os valores via ViewChild/Query:


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
      var local = this.localStorage?.valueOf();

      localStorage.setItem(
        local ?? 'dataFiltro',
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
    const rows =
      (this.dt as any)?.filteredValue ??
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

    rows.forEach((row: any) => {
      const values =
        exportColumns.map(column => {
          const rawValue =
            column.formatter
              ? column.formatter(row)
              : row?.[column.field];

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

  getColumnClass(col: any, product: any): string {
    if (!col.classe) {
      return '';
    }
    // Se a classe for uma função (ex: para o valor positivo/negativo), executa-a passando a linha
    if (typeof col.classe === 'function') {
      return col.classe(product);
    }
    // Se for apenas uma string normal (ex: 'p-tag-danger')
    return col.classe;
  }
}