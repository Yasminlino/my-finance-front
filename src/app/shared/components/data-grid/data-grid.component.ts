import {
  Component,
  EventEmitter,
  Input,
  Output,
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

import {
  ExibirCampos,
  GridColumn,
  GridColumnOption,
  GridColumnType,
  GridRowChange,
  TypeGrid
} from './data-grid.interface';

import { CurrencyInputDirective } from '../../directives/currency-input.directive';


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
  styleUrl: './data-grid.component.scss'
})
export class DataGridComponent {

  // ---------------------------------------------------------------------------
  // Inputs
  // ---------------------------------------------------------------------------

  @Input() titulo = '';

  private _dataSource: any[] = [];

  @Input()
  set dataSource(value: any[]) {
    this._dataSource = (value ?? []).map(row => {
      const item = { ...row };
      this.columns
        .filter(col => col.type === 'date')
        .forEach(col => {
          if (item[col.field] && typeof item[col.field] === 'string') {
            item[col.field] = new Date(item[col.field]);
          }
        });
      return item;
    });
    this.updateTableRows();
  }

  get dataSource(): any[] {
    return this._dataSource;
  }

  @Input() columns: GridColumn[] = [];
  @Input() breadcrumb?: null | MenuItem[] = null;
  @Input() dataKey = 'id';
  @Input() tipoTabela: TypeGrid = TypeGrid.editaModal;
  @Input() dateFilter: Date | undefined;
  @Input() loading = false;
  @Input() itemsButtom: MenuItem[] = [];
  @Input() statusOptions: GridColumnOption[] = [];
  @Input() exibeCampos: ExibirCampos | null = null;
  @Input() deleting = false;
  @Input() disabledRowIds?: Set<any>;

  // ---------------------------------------------------------------------------
  // Outputs
  // ---------------------------------------------------------------------------

  @Output() new = new EventEmitter<any>();
  @Output() edit = new EventEmitter<any>();
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

  private updateTableRows(): void {
    this.tableRows = (this._dataSource ?? []).map(row => {
      const clone = { ...row };

      this.columns.forEach(column => {
        if (typeof column.formatter !== 'function') {
          return;
        }

        try {
          const formattedValue = column.formatter(row);

          clone[`__dg_${column.field}`] =
            formattedValue == null
              ? ''
              : String(formattedValue);

        } catch {
          clone[`__dg_${column.field}`] = '';
        }
      });

      return clone;
    });
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
  isRowDisabled(row: any): boolean {
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

      if (this.isRowBlocked(row)) {
        return;
      }

      editingRowKeys[key] = true;

      this.prepareDateFields(row);

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
  }

  private disableEditMode(): void {
    this.editandoTabela = false;

    if (this.dt) {
      this.dt.editingRowKeys = {};
    }
  }

  private isRowBlocked(row: any): boolean {
    return row?.status === 'PAGO' || row?.bloqueado === true;
  }

  private prepareDateFields(row: any): void {
    this.editableColumns()
      .filter(column => column.type === 'date')
      .forEach(column => {
        const value = row[column.field];

        if (typeof value === 'string') {
          row[column.field] = new Date(value);
        }
      });
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
    const key = this.rowKey(row);

    if (key === undefined) {
      return;
    }

    const original = this.originalRows.get(key);

    if (!original) {
      return;
    }

    if (!this.isRowChanged(row)) {
      this.pendingChanges.delete(key);
      return;
    }

    const changes: Record<string, any> = {};

    this.editableColumns().forEach(column => {
      const currentValue =
        this.normalizeComparableValue(
          row[column.field]
        );

      const originalValue =
        this.normalizeComparableValue(
          original[column.field]
        );

      if (!this.valuesEqual(
        originalValue,
        currentValue
      )) {
        changes[column.field] = currentValue;
      }
    });

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
    });

    this.pendingChanges.clear();
    this.originalRows.clear();
  }

  public clearPendingChanges(): void {
    this.pendingChanges.clear();
    this.originalRows.clear();
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
  ): any {
    const option =
      this.statusOptions.find(
        item => item.value === statusValue
      );

    return option?.classe ?? 'info';
  }

  getStatusClass(
    statusValue: string
  ): string {
    return `status-${this.getSeverityStatus(statusValue)}`;
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

  onDateFilter(
    event: any,
    column: GridColumn,
    table: Table
  ): void {
    // Se houver evento, pega o objeto Date limpo (sem hora)
    const value = event ? this.toDateOnly(event) : null;

    table.filter(
      value,
      column.field,
      this.matchMode(column)
    );
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

      localStorage.setItem(
        'dataFiltroContaMensal',
        event.toISOString()
      );
    }

    this.reload.emit(event);
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
}