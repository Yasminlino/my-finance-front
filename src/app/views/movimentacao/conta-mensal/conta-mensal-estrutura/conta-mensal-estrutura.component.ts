import { Component, OnInit } from '@angular/core';
import { ContaMensalService } from 'src/app/core/services/conta-mensal.service';
import { AgrupamentoContaMensal, GrupoContaMensal, LinhaContaMensal } from 'src/app/core/models/conta-mensal.model';
import { formatCurrencyBR, formatDateInput, formatYearMonth, removeFormatCurrencyBR } from 'src/app/core/utils/mask';
import { Category, CategoryService } from 'src/app/core/services/category.service';


type AlertState = { type: 'success' | 'error' | ''; message: string };

type ColumnFilters = {
  name: string[];         // ✅ agora é array
  categoryName: string[]; // ✅ agora é array
  subCategory: string;    // continua texto
  value: string;          // continua texto
  date: string;           // continua texto yyyy-mm-dd
  status: string[];       // ✅ agora é array
};

@Component({
  selector: 'app-conta-mensal-estrutura',
  templateUrl: './conta-mensal-estrutura.component.html',
})
export class ContaMensalEstruturaComponent implements OnInit {
  STATUS = ["PENDENTE", "PAGO NO PRAZO", "AGUARDANDO", "PAGO ATRASADO"]

  // data
  rows: LinhaContaMensal[] = [];
  loading = false;

  // UI
  alert: AlertState = { type: '', message: '' };
  showToolbar = false;
  showModalCreate = false;
  showModalAdd = false;

  // mês
  defaultMonth = this.getCurrentYearMonth();
  selectedMonth = this.defaultMonth;

  // filtros gerais
  filterStatus = '';
  filterDateFrom = '';
  filterDateTo = '';

  // filtros por coluna
  columnFilters: ColumnFilters = {
    name: [],
    categoryName: [],
    subCategory: '',
    value: '',
    date: '',
    status: [],
  };

  categorias: any[] = [];

  // seleção
  selectedIds = new Set<number>();

  constructor(private service: ContaMensalService, private categoryService: CategoryService) { }

  async ngOnInit() {
    this.categorias = await this.categoryService.list();
    await this.loadMonth(this.defaultMonth);
  }

  async loadMonth(monthYYYYMM: string) {
    try {
      this.loading = true;
      this.selectedMonth = monthYYYYMM;

      const grouped = await this.service.getGroupingByMonth(formatYearMonth(monthYYYYMM));
      this.rows = await this.flatten(grouped ?? []);
      this.selectedIds = new Set();
    } catch {
      this.alert = { type: 'error', message: 'Erro ao carregar transações.' };
      setTimeout(() => (this.alert = { type: '', message: '' }), 5000);
    } finally {
      this.loading = false;
    }
  }

  private async flatten(items: GrupoContaMensal[]): Promise<LinhaContaMensal[]> {
    const flat: LinhaContaMensal[] = [];

    for (const t of items ?? []) {
      flat.push({
        id: t.id,
        idAccount: t.idAccount ?? 0,
        name: t.name,
        value: t.value,
        date: new Date(t.date), // aqui é string ISO -> Date OK
        categoryId: t.categoryId ?? t.account.categoryId,
        categoryName: await this.buscarCategoria(t.categoryId ?? t.account.categoryId),
        subCategory: await this.buscarSubCategoria(t.categoryId ?? t.account.categoryId),      // você não tem isso nesse JSON
        status: t.status,
        statusSalvo: t.status,
        desbloqueiaCampos: false,
      });
    }

    return flat;
  }

  async buscarCategoria(id: any) {
    var categoria = this.categorias.find(c => c.id === id);
    if (!categoria) return '';
    return categoria.name;
  }

  async buscarSubCategoria(id: any) {
    var categoria = this.categorias.find(c => c.id === id);
    if (!categoria) return '';
    return categoria.subCategory;
  }

  // ===== computed =====
  get lockedById(): Map<number, boolean> {
    const map = new Map<number, boolean>();
    this.rows.forEach((t) => map.set(t.id, t.statusSalvo !== 'PENDENTE' && !t.desbloqueiaCampos));
    return map;
  }

  get filteredRows(): LinhaContaMensal[] {
    const includesCI = (value: any, filter: string) => {
      if (!filter) return true;
      return String(value ?? '').toLowerCase().includes(String(filter).toLowerCase());
    };

    const inSelected = (value: any, selected: string[]) => {
      if (!selected || selected.length === 0) return true;
      const v = String(value ?? '').toLowerCase();
      return selected.some(s => String(s).toLowerCase() === v);
    };

    return (this.rows ?? []).filter((item) => {
      if (this.filterStatus && item.statusSalvo !== this.filterStatus) return false;

      const itemDateStr = formatDateInput(item.date);
      const itemDate = itemDateStr ? new Date(itemDateStr) : null;

      if (itemDate && !Number.isNaN(itemDate.getTime())) {
        itemDate.setHours(0, 0, 0, 0);

        if (this.filterDateFrom) {
          const from = new Date(this.filterDateFrom); from.setHours(0, 0, 0, 0);
          if (itemDate < from) return false;
        }
        if (this.filterDateTo) {
          const to = new Date(this.filterDateTo); to.setHours(0, 0, 0, 0);
          if (itemDate > to) return false;
        }
      }

      if (!inSelected(item.name, this.columnFilters.name)) return false;
      if (!inSelected(item.categoryName, this.columnFilters.categoryName)) return false;
      if (!inSelected(item.status, this.columnFilters.status)) return false;

      if (this.columnFilters.date) {
        const m = String(item.date ?? '');
        if (!m.includes(this.columnFilters.date)) return false;
      }

      if (this.columnFilters.value) {
        const raw = String(this.columnFilters.value).trim();
        const asNumber = Number(raw.replace(',', '.'));
        if (Number.isFinite(asNumber) && raw !== '') {
          const v = removeFormatCurrencyBR(item.value);
          if (v < asNumber) return false;
        } else {
          if (!includesCI(item.value, raw)) return false;
        }
      }

      return true;
    });
  }

  get sortedRows(): LinhaContaMensal[] {
    const rank = (sub: any) => {
      const s = String(sub || '').toLowerCase();
      if (s === 'receita' || s === 'receitas') return 0;
      if (s === 'despesa' || s === 'despesas') return 1;
      return 2;
    };

    return [...this.filteredRows].sort((a, b) => {
      const ra = rank(a.subCategory);
      const rb = rank(b.subCategory);
      if (ra !== rb) return ra - rb;
      return String(a.name || '').toUpperCase().localeCompare(String(b.name || '').toUpperCase(), 'pt-BR');
    });
  }

  get allVisibleSelected(): boolean {
    if (!this.sortedRows.length) return false;
    return this.sortedRows.every((r) => this.selectedIds.has(r.id));
  }

  get selectedTotals() {
    let receita = 0;
    let despesa = 0;

    const selected = this.sortedRows.filter((r) => this.selectedIds.has(r.id));
    selected.forEach((item) => {
      const val = removeFormatCurrencyBR(item.value);
      const sub = String(item.subCategory || '').toLowerCase();
      if (sub === 'receita' || sub === 'receitas') receita += val;
      if (sub === 'despesa' || sub === 'despesas') despesa += val;
    });

    return { receita, despesa, saldo: receita - despesa, count: selected.length };
  }

  // ===== header events =====
  onMonthChange(month: string) {
    if (month) this.loadMonth(month);
  }

  onToggleToolbar() {
    this.showToolbar = !this.showToolbar;
  }

  onOpenAddBatch() {
    if (!this.selectedMonth) return this.showErrorRequired();
    this.showModalAdd = true;
  }

  onOpenCreate() {
    if (!this.selectedMonth) return this.showErrorRequired();
    this.showModalCreate = true;
  }

  onRefresh() {
    if (!this.selectedMonth) return this.showErrorRequired();
    this.loadMonth(this.selectedMonth);
  }

  private showErrorRequired() {
    this.alert = { type: 'error', message: 'Preencha os campos obrigatórios' };
    setTimeout(() => (this.alert = { type: '', message: '' }), 5000);
  }

  // ===== filters events =====
  onGeneralFiltersChange(v: { status: string; from: string; to: string }) {
    this.filterStatus = v.status;
    this.filterDateFrom = v.from;
    this.filterDateTo = v.to;
  }

  onClearAllFilters() {
    this.filterStatus = '';
    this.filterDateFrom = '';
    this.filterDateTo = '';
    this.columnFilters = {
      name: [],
      categoryName: [],
      subCategory: '',
      value: '',
      date: '',
      status: [],
    };
  }

  // ===== table events =====
  onToggleSelectAllVisible() {
    const n = new Set(this.selectedIds);
    if (this.allVisibleSelected) this.sortedRows.forEach((r) => n.delete(r.id));
    else this.sortedRows.forEach((r) => n.add(r.id));
    this.selectedIds = n;
  }

  onToggleRow(id: number) {
    const n = new Set(this.selectedIds);
    if (n.has(id)) n.delete(id);
    else n.add(id);
    this.selectedIds = n;
  }

  onColumnFiltersChange(next: any) {
    this.columnFilters = { ...this.columnFilters, ...next };
  }

  onChangeRowField(e: { id: number; field: 'value' | 'date' | 'status'; value: string }) {
    this.rows = this.rows.map((item) => {
      if (item.id !== e.id) return item;
      if (e.field === 'value') return { ...item, value: formatCurrencyBR(e.value) };
      if (e.field === 'date') return { ...item, month: e.value };
      return { ...item, status: e.value };
    });
  }

  unlock(id: number) {
    this.rows = this.rows.map(r =>
      r.id === id
        ? { ...r, desbloqueiaCampos: true, status: r.statusSalvo }  // <- importante
        : r
    );
  }


  async onSaveRow(id: number) {
    const data = this.rows.find((d) => d.id === id);
    if (!data) return;

    if (!data.name || !data.value || !data.date || !data.status) {
      this.alert = { type: 'error', message: 'Preencha os campos obrigatórios' };
      setTimeout(() => (this.alert = { type: '', message: '' }), 5000);
      return;
    }

    try {
      const payload = { ...data, value: removeFormatCurrencyBR(data.value) };
      const resp = await this.service.updateTransaction(payload);
      const newStatus = resp?.status ?? data.status;

      this.rows = this.rows.map((t) =>
        t.id === id
          ? { ...t, status: newStatus, statusSalvo: newStatus, desbloqueiaCampos: newStatus === 'PENDENTE' ? t.desbloqueiaCampos : false }
          : t
      );

      this.alert = { type: 'success', message: 'Transação atualizada com sucesso!' };
      setTimeout(() => (this.alert = { type: '', message: '' }), 5000);
    } catch {
      this.alert = { type: 'error', message: 'Erro ao atualizar. Tente novamente.' };
      setTimeout(() => (this.alert = { type: '', message: '' }), 5000);
    }
  }

  async onDeleteRow(id: number) {
    const ok = window.confirm('Tem certeza que deseja excluir esta transação?');
    if (!ok) return;

    try {
      await this.service.deleteTransaction(id);
      this.rows = this.rows.filter((r) => r.id !== id);
      const n = new Set(this.selectedIds); n.delete(id); this.selectedIds = n;

      this.alert = { type: 'success', message: 'Transação deletada com sucesso!' };
      setTimeout(() => (this.alert = { type: '', message: '' }), 8000);
    } catch {
      this.alert = { type: 'error', message: 'Falha ao deletar. Tente novamente.' };
      setTimeout(() => (this.alert = { type: '', message: '' }), 8000);
    }
  }

  // ===== template helpers =====
  money(v: any) { return formatCurrencyBR(v); }
  dateInput(v: any) { return formatDateInput(v); }

  private getCurrentYearMonth(): string {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  }
}
