import { Component, OnInit } from '@angular/core';
import { TipoMovimentacaoService } from 'src/app/core/services/tipo-movimentacao.service';
import { TipoMovimentacaoDto } from 'src/app/core/models/tipo-movimentacao.model';

type AlertState = { type: 'success' | 'error' | ''; message: string };

@Component({
  selector: 'app-tipo-movimentacao-list',
  templateUrl: './tipo-movimentacao-list.component.html',
  styleUrls: ['./tipo-movimentacao-list.component.scss'],
})
export class TipoMovimentacaoListComponent implements OnInit {
  items: TipoMovimentacaoDto[] = [];
  filtered: TipoMovimentacaoDto[] = [];

  loading = false;
  errorMsg = '';

  q = '';

  // modal/form
  showModalForm = false;
  editing: TipoMovimentacaoDto | null = null;

  alert: AlertState = { type: '', message: '' };

  constructor(private service: TipoMovimentacaoService) {}

  async ngOnInit() {
    await this.load();
  }

  async load() {
    try {
      this.loading = true;
      this.errorMsg = '';
      this.items = (await this.service.list()) ?? [];
      this.applyFilters();
    } catch (e: any) {
      this.errorMsg = e?.message ?? 'Erro ao carregar Tipos de Movimentação.';
    } finally {
      this.loading = false;
    }
  }

  applyFilters() {
    const term = this.q.trim().toLowerCase();

    this.filtered = [...this.items]
      .sort((a, b) => (a.nomeTipoMovimentacao ?? '').localeCompare(b.nomeTipoMovimentacao ?? ''))
      .filter((c) => {
        if (!term) return true;
        return (
          (c.nomeTipoMovimentacao ?? '').toLowerCase().includes(term) ||
          String(c.id).includes(term)
        );
      });
  }

  onSearchChange(v: string) {
    this.q = v;
    this.applyFilters();
  }

  get totalMetas(): number {
    return this.filtered.reduce((sum, c) => sum + (Number(c.valorMeta) || 0), 0);
  }

  formatMoney(value: any) {
    const n = Number(value) || 0;
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(n);
  }

  openCreate() {
    this.editing = null;
    this.showModalForm = true;
  }

  openEdit(item: TipoMovimentacaoDto) {
    this.editing = item;
    this.showModalForm = true;
  }

  closeForm(reload?: boolean) {
    this.showModalForm = false;
    this.editing = null;
    if (reload) this.load();
  }

  async onDelete(item: TipoMovimentacaoDto) {
    const ok = window.confirm(`Excluir o tipo de movimentação "${item.nomeTipoMovimentacao}"?`);
    if (!ok) return;

    try {
      await this.service.delete(item.id);
      this.alert = { type: 'success', message: 'Tipo de Movimentação deletado com sucesso!' };
      setTimeout(() => (this.alert = { type: '', message: '' }), 3000);
      await this.load();
    } catch {
      this.alert = {
        type: 'error',
        message: 'Falha ao deletar. O tipo de Movimentação pode estar vinculado a transações.',
      };
      setTimeout(() => (this.alert = { type: '', message: '' }), 12000);
    }
  }
}
