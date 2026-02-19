import { Component, EventEmitter, HostListener, Input, Output, OnChanges, SimpleChanges } from '@angular/core';
import { FormBuilder, FormControl, FormGroup } from '@angular/forms';
import { LinhaContaMensal } from 'src/app/core/models/conta-mensal.model';
import { formatCurrencyBR, formatDateInput } from 'src/app/core/utils/mask';

type RowForm = FormGroup<{
  value: FormControl<string>;
  date: FormControl<string>;
  status: FormControl<string>;
}>;

type ColumnFilters = {
  name: string[];         // multi
  categoryName: string[]; // multi
  status: string[];       // multi
  value: string;          // texto
  date: string;           // yyyy-mm-dd
};

@Component({
  selector: 'app-conta-mensal-list',
  templateUrl: './conta-mensal-list.component.html',
})
export class ContaMensalListComponent implements OnChanges {
  @Input() rows: LinhaContaMensal[] = [];
  @Input() loading = false;

  @Input() lockedById = new Map<number, boolean>();
  @Input() selectedIds = new Set<number>();
  @Input() allVisibleSelected = false;

  @Input() columnFilters: Partial<ColumnFilters> = {};
  @Input() statusOptions: string[] = [];

  @Output() toggleSelectAllVisible = new EventEmitter<void>();
  @Output() toggleRow = new EventEmitter<number>();
  @Output() columnFiltersChange = new EventEmitter<any>();

  @Output() changeField = new EventEmitter<{ id: number; field: 'value' | 'date' | 'status'; value: string }>();
  @Output() unlock = new EventEmitter<number>();
  @Output() saveRow = new EventEmitter<number>();
  @Output() deleteRow = new EventEmitter<number>();

  rowForms = new Map<number, RowForm>();

  // dropdown state
  ddContaOpen = false;
  ddCategoriaOpen = false;
  ddStatusOpen = false;

  // opções (derivadas das linhas)
  contaOptions: string[] = [];
  categoriaOptions: string[] = [];

  money(v: any) { return formatCurrencyBR(v); }
  dateInput(v: any) { return formatDateInput(v); }

  isLocked(id: number): boolean {
    return this.lockedById.get(id) ?? false;
  }

  constructor(private fb: FormBuilder) { }

  ngOnChanges(changes: SimpleChanges): void {
    // garante defaults para evitar undefined em template
    this.columnFilters = {
      name: Array.isArray(this.columnFilters?.name) ? this.columnFilters!.name! : [],
      categoryName: Array.isArray(this.columnFilters?.categoryName) ? this.columnFilters!.categoryName! : [],
      status: Array.isArray(this.columnFilters?.status) ? this.columnFilters!.status! : [],
      value: this.columnFilters?.value ?? '',
      date: this.columnFilters?.date ?? '',
    };

    if (changes['rows']) {
      // monta options (únicos)
      this.contaOptions = Array.from(
        new Set((this.rows ?? []).map(r => (r.name ?? '').trim()).filter(Boolean))
      ).sort((a, b) => a.localeCompare(b));

      this.categoriaOptions = Array.from(
        new Set((this.rows ?? []).map(r => (r.categoryName ?? '').trim()).filter(Boolean))
      ).sort((a, b) => a.localeCompare(b));

      // forms das linhas
      for (const r of this.rows) {
        let form = this.rowForms.get(r.id);

        if (!form) {
          form = this.fb.group({
            value: this.fb.control(this.money(r.value), { nonNullable: true }),
            date: this.fb.control(this.dateInput(r.date), { nonNullable: true }),
            status: this.fb.control(String(r.status ?? ''), { nonNullable: true }),
          });
          this.rowForms.set(r.id, form);
        } else {
          if (!form.controls.value.dirty) {
            form.controls.value.setValue(this.money(r.value), { emitEvent: false });
          }
          if (!form.controls.date.dirty) {
            form.controls.date.setValue(this.dateInput(r.date), { emitEvent: false });
          }
          if (!form.controls.status.dirty) {
            form.controls.status.setValue(String(r.status ?? ''), { emitEvent: false });
          }
        }
      }

      // Remove forms de linhas que saíram da lista (evita acumular)
      const idsVisiveis = new Set(this.rows.map(x => x.id));
      for (const id of Array.from(this.rowForms.keys())) {
        if (!idsVisiveis.has(id)) this.rowForms.delete(id);
      }
    }
  }

  // fecha dropdown clicando fora
  @HostListener('document:click')
  onDocClick() {
    this.ddContaOpen = false;
    this.ddCategoriaOpen = false;
    this.ddStatusOpen = false;
  }

  toggleDropdown(which: 'conta' | 'categoria' | 'status', ev: MouseEvent) {
    ev.stopPropagation();
    this.ddContaOpen = which === 'conta' ? !this.ddContaOpen : false;
    this.ddCategoriaOpen = which === 'categoria' ? !this.ddCategoriaOpen : false;
    this.ddStatusOpen = which === 'status' ? !this.ddStatusOpen : false;
  }

  // ========= filtros =========

  setColumnFilter(field: keyof ColumnFilters, value: any) {
    // mantém seu padrão: emite só o campo alterado
    this.columnFiltersChange.emit({ [field]: value });
  }

  isSelected(field: 'name' | 'categoryName' | 'status', value: string): boolean {
    const arr = (this.columnFilters as any)[field] as string[] | undefined;
    return Array.isArray(arr) ? arr.includes(value) : false;
  }

  toggleMulti(field: 'name' | 'categoryName' | 'status', value: string, checked: boolean) {
    const current = Array.isArray((this.columnFilters as any)[field]) ? ([...(this.columnFilters as any)[field]] as string[]) : [];
    const next = checked
      ? Array.from(new Set([...current, value]))
      : current.filter(x => x !== value);

    this.setColumnFilter(field, next);
  }

  clearMulti(field: 'name' | 'categoryName' | 'status') {
    this.setColumnFilter(field, []);
  }

  multiLabel(field: 'name' | 'categoryName' | 'status', label: string) {
    const arr = (this.columnFilters as any)[field] as string[] | undefined;
    const n = Array.isArray(arr) ? arr.length : 0;
    if (!n) return `${label}: Todos`;
    if (n === 1) return `${label}: ${arr![0]}`;
    return `${label}: ${n} selecionados`;
  }

  // ========= tabela =========

  trackById(_: number, row: LinhaContaMensal) {
    return row.id;
  }

  maskValueTyping(rowId: number, ev: Event) {
    const form = this.rowForms.get(rowId);
    if (!form) return;

    const input = ev.target as HTMLInputElement;
    const raw = input.value ?? '';

    let digits = raw.replace(/\D/g, '');

    if (!digits) {
      form.controls.value.setValue('', { emitEvent: false });
      input.value = '';
      return;
    }

    digits = digits.replace(/^0+/, '');
    if (!digits) digits = '0';

    const padded = digits.padStart(3, '0');
    const intPart = padded.slice(0, -2);
    const decPart = padded.slice(-2);

    const intWithDots = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    const formatted = `${intWithDots},${decPart}`;

    form.controls.value.setValue(formatted, { emitEvent: false });
    input.value = formatted;

    const pos = formatted.length;
    input.setSelectionRange(pos, pos);
  }

  commitValue(id: number) {
    const f = this.rowForms.get(id);
    if (!f) return;

    this.changeField.emit({ id, field: 'value', value: f.controls.value.value });
    f.controls.value.markAsPristine();
  }

  commitDate(id: number) {
    const f = this.rowForms.get(id);
    if (!f) return;

    this.changeField.emit({ id, field: 'date', value: f.controls.date.value });
    f.controls.date.markAsPristine();
  }

  commitStatus(id: number) {
    const f = this.rowForms.get(id);
    if (!f) return;

    this.changeField.emit({ id, field: 'status', value: f.controls.status.value });
    f.controls.status.markAsPristine();
  }
}