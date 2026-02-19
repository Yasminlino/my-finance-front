import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { ItemListaDto, ItemListaService } from 'src/app/core/services/item-lista.service';
import { ListaService } from 'src/app/core/services/lista.service';
import { formatCurrencyBR } from 'src/app/core/utils/mask';

type AlertState = { type: 'success' | 'error' | ''; message: string };

type SortKey = 'id' | 'descricao' | 'valor' | 'status';


@Component({
  selector: 'app-lista-de-orcamento',
  templateUrl: './lista-de-orcamento.component.html',
  styleUrls: ['./lista-de-orcamento.component.scss'],
})
export class ListaDeOrcamentoComponent implements OnInit {

  sortState: { key: SortKey; dir: 'asc' | 'desc' } = { key: 'id', dir: 'asc' };

  itenslista: ItemListaDto[] = [];
  filtered: ItemListaDto[] = [];
  titulo: string = '';
  tipoLista: number = 0;
  showModalConfigCores = false;
  statusColors: Record<string, string> = {};


  loading = false;
  errorMsg = '';

  colFilters = {
    id: '',
    descricao: '',
    valorMin: '',
    valorMax: '',
    status: [] as string[], // multi
  };

  statusOptions: string[] = [];


  q = '';
  statusFilter: 'ALL' | 'true' | 'false' = 'ALL';

  alert: AlertState = { type: '', message: '' };

  // modal
  showModalCreateItem = false;
  showModalUpdateItem = false;

  editingItem: ItemListaDto | null = null;
  listaId: number = 0;
  total: any = 0;
  situacoes: string[] = [];
  totalPorSituacao: { situacao: string | undefined; valorTotal: number; }[] = [];

  constructor(
    private activatedRoute: ActivatedRoute,
    private ItemListaservice: ItemListaService, private ListaService: ListaService) { }

  async ngOnInit() {
    await this.load();
  }

  async load() {
    try {
      this.loading = true;
      this.errorMsg = '';

      await this.validaItemLista();

      this.itenslista = await this.ItemListaservice.GetItemListaById(this.listaId);

      this.loadStatusColors();

      this.valculaTotal();
      this.aplicarFiltros();
    } catch (e: any) {
      this.errorMsg = e?.message ?? 'Erro ao carregar tipos de cartão.';
    } finally {
      this.loading = false;
    }
  }
  valculaTotal() {
    const situacoesUnicas = Array.from(new Set(this.itenslista.map(i => i.status).filter(Boolean))) as string[];
    this.statusOptions = situacoesUnicas;

    this.totalPorSituacao = this.itenslista.some(item => item.valor)
      ? situacoesUnicas.map(situacao => {
        const valorTotal = this.itenslista
          .filter(item => item.status === situacao)
          .reduce((total, item) => total + (item.valor ?? 0), 0);
        return { situacao, valorTotal };
      })
      : [];
  }

  onColFilterChange<K extends keyof typeof this.colFilters>(key: K, value: any) {
    (this.colFilters[key] as any) = value;
    this.aplicarFiltros();
  }

  onConfigCoresClosed(ev: { reload: boolean; colors?: Record<string, string> }) {
    this.showModalConfigCores = false;

    if (ev.reload && ev.colors) {
      this.saveStatusColors(ev.colors);
    }
  }

  sortBy(key: SortKey) {
    if (this.sortState.key === key) {
      this.sortState.dir = this.sortState.dir === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortState.key = key;
      this.sortState.dir = 'asc';
    }
    this.aplicarFiltros();
  }

  sortIcon(key: SortKey) {
    if (this.sortState.key !== key) return '↕️';
    return this.sortState.dir === 'asc' ? '⬆️' : '⬇️';
  }


  onStatusMultiChange(event: Event) {
    const select = event.target as HTMLSelectElement;
    const selected = Array.from(select.selectedOptions).map(o => o.value);
    this.colFilters.status = selected;
    this.aplicarFiltros();
  }

  clearColumnFilters() {
    this.colFilters = { id: '', descricao: '', valorMin: '', valorMax: '', status: [] };
    this.aplicarFiltros();
  }



  async validaItemLista() {
    this.listaId = Number(this.activatedRoute.snapshot.paramMap.get('id'));

    var lista = await this.ListaService.GetListaById(this.listaId);

    switch (lista.tipoMovimentacao) {
      case 1:
        this.tipoLista = 1;
        this.titulo = 'Lista de Checagem'; break;
      case 2:
        this.tipoLista = 2;
        this.titulo = 'Cronograma'; break;
      case 3:
        this.tipoLista = 3;
        this.titulo = 'Orçamento';
        break;
    }
  }
  aplicarFiltros() {
    const term = this.q.trim().toLowerCase();

    const idFilter = this.colFilters.id.trim();
    const descFilter = this.colFilters.descricao.trim().toLowerCase();

    const vMin = this.colFilters.valorMin !== '' ? Number(this.colFilters.valorMin) : null;
    const vMax = this.colFilters.valorMax !== '' ? Number(this.colFilters.valorMax) : null;

    const statusMulti = this.colFilters.status; // string[]

    this.filtered = [...this.itenslista]
      // filtro geral (se quiser manter)
      .filter(c => {
        if (!term) return true;
        return (
          (c.descricao ?? '').toLowerCase().includes(term) ||
          String(c.id).includes(term)
        );
      })

      // ID coluna
      .filter(c => {
        if (!idFilter) return true;
        return String(c.id).includes(idFilter);
      })

      // Descrição coluna
      .filter(c => {
        if (!descFilter) return true;
        return (c.descricao ?? '').toLowerCase().includes(descFilter);
      })

      // Valor min/max
      .filter(c => {
        const valor = c.valor ?? 0;
        if (vMin !== null && !Number.isNaN(vMin) && valor < vMin) return false;
        if (vMax !== null && !Number.isNaN(vMax) && valor > vMax) return false;
        return true;
      })

      // Situação multi
      .filter(c => {
        if (!statusMulti.length) return true;
        return statusMulti.includes(String(c.status));
      })

      // seu statusFilter antigo (se quiser manter, senão remova)
      .filter(c => {
        if (this.statusFilter === 'ALL') return true;
        return String(c.status) === this.statusFilter;
      });

    const dir = this.sortState.dir === 'asc' ? 1 : -1;
    const key = this.sortState.key;

    this.filtered.sort((a, b) => {
      const av: any = (a as any)[key];
      const bv: any = (b as any)[key];

      // números (id/valor)
      if (key === 'id' || key === 'valor') {
        const an = Number(av ?? 0);
        const bn = Number(bv ?? 0);
        return (an - bn) * dir;
      }

      // strings (descricao/status)
      const as = String(av ?? '').toLowerCase();
      const bs = String(bv ?? '').toLowerCase();
      return as.localeCompare(bs) * dir;
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

  abrirConfigCores() {
    this.showModalConfigCores = true;
  }
  fecharConfigCores(reload: boolean) {
    this.showModalConfigCores = false;
    if (reload) this.loadStatusColors(); // reaplica
  }

  // carrega/salva localStorage (rápido)
  loadStatusColors() {
    try {
      const raw = localStorage.getItem('statusColors');
      this.statusColors = raw ? JSON.parse(raw) : {};
    } catch {
      this.statusColors = {};
    }
  }

  saveStatusColors(colors: Record<string, string>) {
    this.statusColors = colors;
    localStorage.setItem('statusColors', JSON.stringify(colors));
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
    const ok = window.confirm(`Excluir a lista "${item.descricao}"?`);
    if (!ok) return;

    try {
      await this.ItemListaservice.delete(item.id);
      this.alert = { type: 'success', message: 'Item da lista deletado com sucesso!' };
      setTimeout(() => (this.alert = { type: '', message: '' }), 3000);
      await this.load();
    } catch {
      this.alert = { type: 'error', message: 'Falha ao deletar. Pode estar vinculado a transações.' };
      setTimeout(() => (this.alert = { type: '', message: '' }), 12000);
    }
  }


  formatCurrency(value: any) {
    var valorFormatado = formatCurrencyBR(value);
    return valorFormatado;
  }
}