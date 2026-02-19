import { Component, OnInit } from '@angular/core';
import { ListaDto, ListaService } from 'src/app/core/services/lista.service';

type AlertState = { type: 'success' | 'error' | ''; message: string };

@Component({
  selector: 'app-lista-root',
  templateUrl: './lista-root.component.html',
  styleUrls: ['./lista-root.component.scss'],
})
export class ListaRootComponent implements OnInit {
  listas: ListaDto[] = [];
  filtered: ListaDto[] = [];

  loading = false;
  errorMsg = '';

  q = '';
  statusFilter: 'ALL' | 'true' | 'false' = 'ALL';

  alert: AlertState = { type: '', message: '' };

  // modal
  showModalCreate = false;
  showModalUpdate = false;
  editing: ListaDto | null = null;

  constructor(private service: ListaService) { }

  async ngOnInit() {
    await this.load();
  }

  async load() {
    try {
      this.loading = true;
      this.errorMsg = '';
      this.listas = await this.service.list();
      this.aplicarFiltros();
    } catch (e: any) {
      this.errorMsg = e?.message ?? 'Erro ao carregar tipos de cartão.';
    } finally {
      this.loading = false;
    }
  }

  aplicarFiltros() {
    const term = this.q.trim().toLowerCase();

    this.filtered = [...this.listas]
      .filter(c => {
        if (!term) return true;
        return (
          (c.nome ?? '').toLowerCase().includes(term) ||
          String(c.id).includes(term)
        );
      })
      .filter(c => {
        if (this.statusFilter === 'ALL') return true;
        return String(c.status) === this.statusFilter;
      });
  }


  onSearchChange(v: string) {
    this.q = v;
    this.aplicarFiltros();
  }

  pesquisarStatus(v: string) {
    this.statusFilter = v as any;
    this.aplicarFiltros();
  }

  abrirModalCriar() {
    this.editing = null;
    this.showModalCreate = true;
  }

  abrirModalAtualizar(item: ListaDto) {
    this.editing = item;
    this.showModalUpdate = true;
  }

  abrirItemLista(item: ListaDto) {
    if(!item.tipoMovimentacao) return;
    if(item.tipoMovimentacao === 1) {
      window.open(`/catalogos-listas/${item.id}/checagem`, '_blank');
    } else if(item.tipoMovimentacao === 2) {
      window.open(`/catalogos-listas/${item.id}/cronograma`, '_blank');
    } else if(item.tipoMovimentacao === 3) {
      window.open(`/catalogos-listas/${item.id}/orcamento`, '_blank');
    } else {
      window.open(`/catalogos-listas/${item.id}`, '_blank');
    }
    
  }

  fecharModalCriar(reload: boolean) {
    this.showModalCreate = false;
    if (reload) this.load();
  }

  fecharModalAtualizar(reload: boolean) {
    this.showModalUpdate = false;
    this.editing = null;
    if (reload) this.load();
  }

  async onDelete(item: ListaDto) {
    const ok = window.confirm(`Excluir a lista "${item.nome}"?`);
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
