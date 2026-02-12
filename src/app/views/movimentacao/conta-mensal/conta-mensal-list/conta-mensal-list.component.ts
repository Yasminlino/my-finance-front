import { Component, EventEmitter, Input, Output, OnChanges, SimpleChanges } from '@angular/core';
import { FormBuilder, FormControl, FormGroup } from '@angular/forms';
import { LinhaContaMensal } from 'src/app/core/models/conta-mensal.model';
import { formatCurrencyBR, formatDateInput } from 'src/app/core/utils/mask';

type RowForm = FormGroup<{
  value: FormControl<string>;
  date: FormControl<string>;
  status: FormControl<string>;
}>;

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

  @Input() columnFilters: any = {};
  @Input() statusOptions: string[] = [];

  @Output() toggleSelectAllVisible = new EventEmitter<void>();
  @Output() toggleRow = new EventEmitter<number>();
  @Output() columnFiltersChange = new EventEmitter<any>();

  @Output() changeField = new EventEmitter<{ id: number; field: 'value' | 'date' | 'status'; value: string }>();
  @Output() unlock = new EventEmitter<number>();
  @Output() saveRow = new EventEmitter<number>();
  @Output() deleteRow = new EventEmitter<number>();

  rowForms = new Map<number, RowForm>();

  money(v: any) { return formatCurrencyBR(v); }
  dateInput(v: any) { return formatDateInput(v); }

  isLocked(id: number): boolean {
    return this.lockedById.get(id) ?? false;
  }

  constructor(private fb: FormBuilder) { }

  ngOnChanges(changes: SimpleChanges): void {
    if (!changes['rows']) return;

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
        // Não sobrescreve o que o usuário está digitando (dirty=true)
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

  setColumnFilter(field: string, value: string) {
    this.columnFiltersChange.emit({ [field]: value });
  }

  trackById(_: number, row: LinhaContaMensal) {
    return row.id;
  }
  maskValueTyping(rowId: number, ev: Event) {
    const form = this.rowForms.get(rowId);
    if (!form) return;

    const input = ev.target as HTMLInputElement;
    const raw = input.value ?? '';

    // 1) mantém só dígitos
    let digits = raw.replace(/\D/g, '');

    // se apagou tudo, deixa vazio
    if (!digits) {
      form.controls.value.setValue('', { emitEvent: false });
      input.value = '';
      return;
    }

    // 2) remove zeros à esquerda (pra evitar "000.105,98")
    // mantém pelo menos 1 dígito se tudo era zero
    digits = digits.replace(/^0+/, '');
    if (!digits) digits = '0';

    // 3) interpreta como centavos (últimos 2 dígitos)
    const padded = digits.padStart(3, '0'); // garante pelo menos 0,0x
    const intPart = padded.slice(0, -2);
    const decPart = padded.slice(-2);

    // 4) separador de milhar
    const intWithDots = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, '.');

    const formatted = `${intWithDots},${decPart}`;

    form.controls.value.setValue(formatted, { emitEvent: false });
    input.value = formatted;

    // mantém o cursor no final (simples e estável)
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