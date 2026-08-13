import { Component, Input, Output, EventEmitter, ViewChild } from '@angular/core';
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
import { GridColumn, GridColumnType, GridRowChange } from './data-grid.interface';
import { FileUploadModule } from 'primeng/fileupload';
import { ToolbarModule } from 'primeng/toolbar';
import { RippleModule } from 'primeng/ripple';
import { TagModule } from 'primeng/tag';
import { BreadcrumbModule } from 'primeng/breadcrumb';


export interface GridColumnOption {
  label: string;
  value: any;
}

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
    BreadcrumbModule
  ],
  templateUrl: './data-grid.component.html',
  styleUrl: './data-grid.component.scss'
})
export class DataGridComponent {
  @Input('titulo') titulo: string = 'Cadastro de Categorias';
  private _dataSource: any[] = [];
  @Input('dataSource')
  set dataSource(value: any[]) {
    this._dataSource = value ?? [];
    this.updateTableRows();
  }
  get dataSource(): any[] {
    return this._dataSource;
  }
  @Input('filter') filter: boolean = false;
  @Input('selected') selected: boolean = false;
  @Input('paginator') paginator: boolean = false;
  @Input('sortable') sortable: boolean = false;
  @Input('export') export: boolean = false;
  @Input('columns') columns: GridColumn[] = [];
  @Input('breadcrumb') breadcrumb: any;
  @Input('columnIcons') columnIcons: Record<string, string> = {};
  @Input('dataKey') dataKey: string = 'id';
  /** Exibe a barra com "Salvar tudo" e "Excluir selecionadas". */
  @Input('batchActions') batchActions: boolean = false;

  @Output() new = new EventEmitter<any>();
  @Output() edit = new EventEmitter<any>();
  @Output() delete = new EventEmitter<any>();
  @Output() activate = new EventEmitter<any>();
  @Output() deactivate = new EventEmitter<any>();
  /** Emitido ao clicar em "Salvar tudo" com as alterações inline pendentes. */
  @Output() saveInline = new EventEmitter<GridRowChange[]>();
  /** Emitido ao clicar em "Excluir selecionadas" com as linhas marcadas. */
  @Output() deleteSelected = new EventEmitter<any[]>();

  @ViewChild('dt') dt?: Table;
  home = { icon: 'pi pi-home', routerLink: '/' };

  productDialog: boolean = false;
  submitted: boolean = false;

  defaultColumnIcons: Record<string, string> = {
    name: 'pi pi-file',
    subCategory: 'pi pi-tags',
    naturezaOperacao: 'pi pi-sitemap',
    status: 'pi pi-info-circle',
    actions: 'pi pi-ellipsis-v'
  };

  getColumnIcon(col: GridColumn): string | undefined {
    return col?.icon || this.columnIcons[col?.field] || this.defaultColumnIcons[col?.field];
  }

  first: number = 0;
  rows: number = 5;
  selectedItems: any[] = [];

  /** Versão da `dataSource` enriquecida com campos formatados para pesquisa/exportação. */
  tableRows: any[] = [];

  /** Linhas ativadas para edição (chave = valor de dataKey). */
  activeRows: Set<any> = new Set();

  get globalFilterFields(): string[] {
    const base = this.columns.map(c => c.field).filter(f => f !== 'actions');
    const formatted = this.columns
      .filter(c => typeof c.formatter === 'function')
      .map(c => `__dg_${c.field}`);
    return [...base, ...formatted];
  }

  private updateTableRows(): void {
    if (!this._dataSource) {
      this.tableRows = [];
      return;
    }
    // Cria clones das linhas e adiciona campos auxiliares com os valores formatados
    this.tableRows = this._dataSource.map(row => {
      const clone: any = { ...row };
      this.columns.forEach(col => {
        if (typeof col.formatter === 'function') {
          try {
            const formatted = col.formatter(row);
            clone[`__dg_${col.field}`] = formatted == null ? '' : String(formatted);
          } catch (e) {
            clone[`__dg_${col.field}`] = '';
          }
        }
      });
      return clone;
    });
  }

  rowKey(row: any): any {
    return row?.[this.dataKey];
  }

  colActions(col: GridColumn): string[] {
    return col.functions?.length ? col.functions : ['edit', 'delete'];
  }

  /** Indica se a coluna de ações usa o recurso de ativar/desativar linha para edição. */
  hasActivation(col: GridColumn): boolean {
    const functions = col.functions ?? [];
    return functions.includes('activate') || functions.includes('deactivate');
  }

  isRowActive(row: any): boolean {
    return this.activeRows.has(this.rowKey(row));
  }

  activateRow(row: any): void {
    this.activeRows.add(this.rowKey(row));
    this.activate.emit(row);
  }

  deactivateRow(row: any): void {
    this.activeRows.delete(this.rowKey(row));
    this.deactivate.emit(row);
  }

  onEditClick(row: any, col: GridColumn): void {
    // Sem o recurso de ativação (ou já ativo) o editar dispara normalmente.
    if (!this.hasActivation(col) || this.isRowActive(row)) {
      this.edit.emit(row);
    }
  }

  onNewClick(row: any, col: GridColumn): void {
    this.new.emit();
  }

  // ---------------------------------- Edição inline ----------------------------------

  /** Linhas em modo de edição inline (chave = valor de dataKey). */
  editingRows: Set<any> = new Set();
  /** Snapshot dos valores originais de cada linha em edição (usado no cancelar). */
  rowSnapshots: Map<any, Record<string, any>> = new Map();
  /** Alterações pendentes aguardando o botão "Salvar tudo". */
  pendingChanges: Map<any, GridRowChange> = new Map();

  get pendingCount(): number {
    return this.pendingChanges.size;
  }

  isRowEditing(row: any): boolean {
    return this.editingRows.has(this.rowKey(row));
  }

  isRowDirty(row: any): boolean {
    return this.pendingChanges.has(this.rowKey(row));
  }

  isInlineEditable(col: GridColumn): boolean {
    if (col.field === 'actions' || col.editable === false) return false;
    return (
      col.type === undefined ||
      col.type === 'text' ||
      col.type === 'select' ||
      col.type === 'multiselect' ||
      col.type === 'number' ||
      col.type === 'date' ||
      col.type === 'boolean'
    );
  }

  editableColumns(): GridColumn[] {
    return this.columns.filter(c => this.isInlineEditable(c));
  }

  /** Liga o modo de edição inline da linha, guardando os valores originais. */
  startInlineEdit(row: any): void {
    const key = this.rowKey(row);
    if (key === undefined || this.isRowEditing(row)) return;
    this.editingRows.add(key);
    const snapshot: Record<string, any> = {};
    this.editableColumns().forEach(c => (snapshot[c.field] = this.cloneValue(row[c.field])));
    this.rowSnapshots.set(key, snapshot);
  }

  /** Aplica as alterações da linha e as marca como pendentes (para "Salvar tudo"). */
  commitInlineEdit(row: any): void {
    const key = this.rowKey(row);
    if (key === undefined || !this.isRowEditing(row)) return;
    const snapshot = this.rowSnapshots.get(key) ?? {};
    const changes: Record<string, any> = {};
    this.editableColumns().forEach(c => {
      if (!this.valuesEqual(snapshot[c.field], row[c.field])) {
        changes[c.field] = row[c.field];
      }
    });
    this.editingRows.delete(key);
    this.rowSnapshots.delete(key);
    if (Object.keys(changes).length > 0) {
      this.pendingChanges.set(key, { row, changes });
    } else {
      this.pendingChanges.delete(key);
    }
  }


  /** Descarta a edição inline, restaurando os valores originais da linha. */
  cancelInlineEdit(row: any): void {
    const key = this.rowKey(row);
    if (key === undefined || !this.isRowEditing(row)) return;
    const snapshot = this.rowSnapshots.get(key);
    if (snapshot) {
      this.editableColumns().forEach(c => (row[c.field] = snapshot[c.field]));
    }
    this.editingRows.delete(key);
    this.rowSnapshots.delete(key);
  }

  /** Emite para o componente pai as alterações pendentes salvarem (bulk). */
  onSaveAll(): void {
    // Consolida linhas ainda em modo de edição antes de salvar.
    if (this.editingRows.size) {
      this.dataSource.filter(r => this.isRowEditing(r)).forEach(r => this.commitInlineEdit(r));
    }
    if (this.pendingCount === 0) return;
    this.saveInline.emit(Array.from(this.pendingChanges.values()));
    this.pendingChanges.clear();
  }

  clear(table: Table) {
    table.clear();
  }

  /** Emite para o componente pai as linhas selecionadas excluírem (bulk). */
  onDeleteSelected(): void {
    if (!this.selectedItems.length) return;
    this.deleteSelected.emit([...this.selectedItems]);
  }

  openNew() {
    this.new.emit();
  }

  clearSelection(): void {
    this.selectedItems = [];
  }

  protected valuesEqual(a: any, b: any): boolean {
    if (a === b) return true;
    if (a == null || b == null) return a == null && b == null;
    if (a instanceof Date && b instanceof Date) return a.getTime() === b.getTime();
    return false;
  }

  private cloneValue(v: any): any {
    if (v instanceof Date) return new Date(v.getTime());
    if (Array.isArray(v)) return [...v];
    return v;
  }

  // ---------------------------------- Filtros ----------------------------------

  /** Match mode padrão por tipo de filtro. */
  defaultMatchMode(type?: GridColumnType): string {
    switch (type) {
      case 'select':
        return 'equals';
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

  matchMode(col: GridColumn): string {
    return col.filterMatchMode ?? this.defaultMatchMode(col.type);
  }

  onFilter(event: Event, col: GridColumn, table: Table) {
    const value = (event.target as HTMLInputElement)?.value;
    table.filter(value, col.field, this.matchMode(col));
  }

  onSelectFilter(event: any, col: GridColumn, table: Table) {
    const value = event?.value ?? null;
    table.filter(value, col.field, this.matchMode(col));
  }

  onMultiSelectFilter(event: any, col: GridColumn, table: Table) {
    const value = event?.value ?? null;
    table.filter(value, col.field, this.matchMode(col));
  }

  onBooleanFilter(event: any, col: GridColumn, table: Table) {
    const value = event.checked ? true : null;
    table.filter(value, col.field, this.matchMode(col));
  }

  onNumberFilter(event: any, col: GridColumn, table: Table) {
    const value = event?.value ?? null;
    table.filter(value, col.field, this.matchMode(col));
  }

  onDateFilter(event: any, col: GridColumn, table: Table) {
    const value = event ? this.toDateOnly(event) : null;
    table.filter(value, col.field, this.matchMode(col));
  }

  private toDateOnly(date: Date | string): Date {
    const d = new Date(date);
    return new Date(d.getFullYear(), d.getMonth(), d.getDate());
  }

  /** Aciona a exportação CSV da tabela PrimeNG. */
  onExport(): void {
    // Tentativa primária: usar o exportCSV do PrimeNG quando disponível.
    try {
      if (this.dt && typeof this.dt.exportCSV === 'function') {
        // Some PrimeNG versions may throw when internal filteredValue is undefined,
        // so prefer usar a implementação nativa e cair para o fallback somente se falhar.
        try {
          this.dt.exportCSV();
          return;
        } catch (e) {
          // tslint:disable-next-line:no-console
          console.warn('PrimeNG exportCSV failed, using fallback CSV exporter', e);
        }
      }
    } catch (e) {
      // tslint:disable-next-line:no-console
      console.warn('PrimeNG exportCSV not available or failed', e);
    }

    // Fallback: gerar CSV manualmente a partir das linhas visíveis (filtro aplicado) ou dataSource.
    const rows: any[] = (this.dt as any)?.filteredValue ?? this.dataSource ?? [];
    const exportColumns = this.columns.filter(c => c.type !== 'actions');
    const headers = exportColumns.map(c => c.header ?? c.field);
    const csvRows: string[] = [];
    csvRows.push(headers.map(h => `"${String(h).replace(/"/g, '""')}"`).join(','));

    rows.forEach(row => {
      const values = exportColumns.map(col => {
        const raw = col.formatter ? col.formatter(row) : row?.[col.field];
        const text = raw == null ? '' : String(raw);
        return `"${text.replace(/"/g, '""')}"`;
      });
      csvRows.push(values.join(','));
    });

    const csv = csvRows.join('\r\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    const fileName = `${(this.titulo || 'export')}.csv`;
    link.setAttribute('download', fileName);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }
}



