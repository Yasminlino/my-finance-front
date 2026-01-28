import { Component, OnInit } from '@angular/core';
import { TipoCartaoDto, TipoCartaoService } from 'src/app/core/services/tipo-cartao.service';

type AlertState = { type: 'success' | 'error' | ''; message: string };

@Component({
  selector: 'app-tipo-cartao-list',
  templateUrl: './tipo-cartao-list.component.html',
  styleUrls: ['./tipo-cartao-list.component.scss'],
})
export class TipoCartaoListComponent implements OnInit {
  tipoCartao: TipoCartaoDto[] = [];
  filtered: TipoCartaoDto[] = [];

  loading = false;
  errorMsg = '';

  q = '';
  statusFilter: 'ALL' | 'Ativo' | 'Inativo' = 'ALL'; // se não usar status, pode remover

  alert: AlertState = { type: '', message: '' };

  // modal
  showModalCreate = false;
  showModalUpdate = false;
  editing: TipoCartaoDto | null = null;

  constructor(private service: TipoCartaoService) {}

  async ngOnInit() {
    await this.load();
  }

  async load() {
    try {
      this.loading = true;
      this.errorMsg = '';
      this.tipoCartao = (await this.service.list()) ?? [];
      this.applyFilters();
    } catch (e: any) {
      this.errorMsg = e?.message ?? 'Erro ao carregar tipos de cartão.';
    } finally {
      this.loading = false;
    }
  }

  applyFilters() {
    const term = this.q.trim().toLowerCase();

    this.filtered = [...this.tipoCartao]
      .filter((c) => {
        if (!term) return true;
        return (
          (c.nomeTipoCartao ?? '').toLowerCase().includes(term) ||
          String(c.id).includes(term)
        );
      });

    // se você tiver ativo/inativo no backend, aplique aqui:
    // .filter(c => this.statusFilter === 'ALL' ? true : (c.ativo ? 'Ativo' : 'Inativo') === this.statusFilter);
  }

  onSearchChange(v: string) {
    this.q = v;
    this.applyFilters();
  }

  onStatusChange(v: string) {
    this.statusFilter = v as any;
    this.applyFilters();
  }

  openCreate() {
    this.editing = null;
    this.showModalCreate = true;
  }

  openUpdate(item: TipoCartaoDto) {
    this.editing = item;
    this.showModalUpdate = true;
  }

  closeCreate(reload?: boolean) {
    this.showModalCreate = false;
    if (reload) this.load();
  }

  closeUpdate(reload?: boolean) {
    this.showModalUpdate = false;
    this.editing = null;
    if (reload) this.load();
  }

  async onDelete(item: TipoCartaoDto) {
    const ok = window.confirm(`Excluir o tipo de cartão "${item.nomeTipoCartao}"?`);
    if (!ok) return;

    try {
      await this.service.delete(item.id);
      this.alert = { type: 'success', message: 'Tipo de cartão deletado com sucesso!' };
      setTimeout(() => (this.alert = { type: '', message: '' }), 3000);
      await this.load();
    } catch {
      this.alert = { type: 'error', message: 'Falha ao deletar. Pode estar vinculado a transações.' };
      setTimeout(() => (this.alert = { type: '', message: '' }), 12000);
    }
  }
}
