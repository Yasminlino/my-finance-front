import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { ItemListaService, ItemListaDto } from 'src/app/core/services/item-lista.service';

@Component({
  selector: 'app-lista-de-checagem',
  templateUrl: './lista-de-checagem.component.html',
  styleUrls: ['./lista-de-checagem.component.scss']
})
export class ListaDeChecagemComponent implements OnInit {

  listaId!: number;

  itens: ItemListaDto[] = [];
  filtered: ItemListaDto[] = [];

  loading = false;
  errorMsg = '';

  q = '';
  statusFilter: 'ALL' | 'true' | 'false' = 'ALL';

  showModalCreateItem = false;
  showModalUpdateItem = false;
  editingItem: ItemListaDto | null = null;

  titulo = 'Lista de Checagem';

  constructor(
    private route: ActivatedRoute,
    private service: ItemListaService
  ) {}

  async ngOnInit() {
    this.listaId = Number(this.route.snapshot.paramMap.get('id'));
    await this.load();
  }

  async load() {
    try {
      this.loading = true;
      this.errorMsg = '';
      this.itens = await this.service.GetItemListaById(this.listaId);
      this.aplicarFiltros();
    } catch (e: any) {
      this.errorMsg = e?.message ?? 'Erro ao carregar itens.';
    } finally {
      this.loading = false;
    }
  }

  aplicarFiltros() {
    const term = this.q.toLowerCase();

    this.filtered = this.itens
      .filter(i => !term || i.descricao?.toLowerCase().includes(term))
      .filter(i => {
        if (this.statusFilter === 'ALL') return true;

        if (this.statusFilter === 'true') {
          return i.status === 'CONCLUIDO';
        }

        if (this.statusFilter === 'false') {
          return i.status !== 'CONCLUIDO';
        }

        return true;
      })
      .sort((a, b) => Number(a.status === 'CONCLUIDO') - Number(b.status === 'CONCLUIDO'));
  }

  onSearchChange(v: string) {
    this.q = v;
    this.aplicarFiltros();
  }

  pesquisarStatus(v: string) {
    this.statusFilter = v as any;
    this.aplicarFiltros();
  }

  async toggleConcluido(item: ItemListaDto) {
    const oldStatus = item.status;
    const novoStatus = item.status === 'CONCLUIDO' ? 'PENDENTE' : 'CONCLUIDO';

    item.status = novoStatus;

    try {
      await this.service.update(item);
    } catch {
      item.status = oldStatus; // rollback
    }
  }

  abrirCriarItem() {
    this.editingItem = null;
    this.showModalCreateItem = true;
  }

  abrirEditarItem(item: ItemListaDto) {
    this.editingItem = item;
    this.showModalUpdateItem = true;
  }

  fecharModalCriarItem(reload: boolean) {
    this.showModalCreateItem = false;
    if (reload) this.load();
  }

  fecharModalAtualizarItem(reload: boolean) {
    this.showModalUpdateItem = false;
    this.editingItem = null;
    if (reload) this.load();
  }

  async onDelete(item: ItemListaDto) {
    if (!confirm(`Excluir "${item.descricao}"?`)) return;

    await this.service.delete(item.id);
    await this.load();
  }
}