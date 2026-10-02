import { Component, OnInit, ViewChild } from '@angular/core';
import { DataGridComponent } from 'src/app/shared/components/data-grid/data-grid.component';
import { GridColumn, GridColumnOption } from 'src/app/shared/components/data-grid/data-grid.interface';
import { TagStatus } from 'src/app/shared/enums/status.enum';
import { AlertService } from 'src/app/shared/components/alert.service';
import { ExclusaoEmLoteService } from 'src/app/core/services/exclusao-em-lote.service';
import { ActivatedRoute, Router } from '@angular/router';
import { ItemListaService, ItemListaDto } from 'src/app/core/services/item-lista.service';
import { ListaService } from 'src/app/core/services/lista.service';
import { ExibirCamposConfig } from 'src/app/shared/models/utils/grid-config.constants';

@Component({
  selector: 'app-lista-de-checagem',
  templateUrl: './lista-de-checagem.component.html',
  styleUrls: ['./lista-de-checagem.component.scss']
})
export class ListaDeChecagemComponent implements OnInit {

  itemListas: ItemListaDto[] = [];
  exibirCampos: ExibirCamposConfig | null = null;
  gridColumns: GridColumn[] = [];

  statusOptions: GridColumnOption[] = [
    { label: 'OK', value: 'OK', classe: TagStatus.Success },
    { label: 'PENDENTE', value: 'PENDENTE', classe: TagStatus.Warning }
  ];
  listaId: string | null = null;

  statusLabel(value: string): boolean {
    return value === 'OK' ? true : false;
  }

  lista: ItemListaDto[] = [];
  titulo: string = "Checklist"
  breadcrumb = [{ label: 'Catalago' }, { label: 'Checklist' }]

  loading = false;
  errorMsg = '';

  q = '';

  showModalCreateItem = false;
  showModalUpdateItem = false;

  editing: ItemListaDto | null = null;
  @ViewChild('grid') grid?: DataGridComponent;

  constructor(private itemListaService: ItemListaService, private readonly listaService: ListaService, private readonly alertService: AlertService, private readonly exclusaoEmLote: ExclusaoEmLoteService, private readonly router: Router, private readonly route: ActivatedRoute) { }

  async ngOnInit() {
    this.setExibirCampos()
    this.setGridColumns();
    await this.load();
  }

  private setGridColumns(): void {
    this.gridColumns = [
      {
        field: 'statusBoolean',
        header: 'STATUS',
        formatter: (row) => this.statusLabel(row.status),
        type: 'checkbox', // Ou adicione no seu enum
        width: '5%'
      },
      { field: 'descricao', header: 'DESCRIÇÃO', type: 'text', width: "35%", classe: (row) => row.status == "OK" ? 'text-success' : 'text-danger' },
      { field: 'quantidade', header: 'QUANTIDADE', type: 'number', width: "30%", classe: (row) => row.status == "OK" ? 'text-success' : 'text-danger' },
      { field: 'actions', header: 'Ações', type: 'actions', functions: ['edit', 'delete'] },
    ]
  }

  private setExibirCampos(): void {
    this.exibirCampos = {
      sortable: true,
      paginator: true,
      buttonNew: true,
      buttonEditLine: true,
      buttonDeleteLine: true,
    }
  }

  async load() {
    try {
      this.loading = true;
      this.listaId = this.route.snapshot.paramMap.get('id')
      this.itemListas = (await this.itemListaService.GetItemListaById(Number(this.listaId))).map(i => ({
        ...i,
        statusBoolean: i.status === 'OK'
      }));
      this.titulo = (await this.listaService.GetListaById(Number(this.listaId))).nome
      console.log('Listas carregadas:', this.itemListas);
      this.applyFilters();
    } catch (e: any) {
      this.alertService.error(e?.message ?? 'Erro ao carregar listas.')
    } finally {
      this.loading = false;
    }
  }

  applyFilters() {
    const term = this.q.trim().toLowerCase();

    this.lista = [...this.itemListas]
      .sort((a, b) => (a.descricao ?? '').localeCompare(b.descricao ?? ''))
      .filter(c => {
        if (!term) return true;
        return (c.descricao ?? '').toLowerCase().includes(term) || String(c.id).includes(term);
      });
  }

  onSearchChange(value: string) {
    this.q = value;
    this.applyFilters();
  }

  async toggleConcluido(item: ItemListaDto) {
    const oldStatus = item.status;
    const novoStatus = item.status === 'OK' ? 'PENDENTE' : 'OK';

    item.status = novoStatus;

    try {
      await this.itemListaService.update(item);
    } catch {
      item.status = oldStatus; // rollback
    }
  }
  openCreate() {
    this.editing = null;
    this.showModalCreateItem = true;
  }

  onEdit(lista: ItemListaDto) {
    this.editing = lista;
    this.showModalUpdateItem = true;
  }


  fecharModalCriarItem(reload: boolean) {
    this.showModalCreateItem = false;
    if (reload) this.load();
  }

  fecharModalAtualizarItem(reload: boolean) {
    this.showModalUpdateItem = false;
    this.editing = null;
    if (reload) this.load();
  }

  async onDelete(c: ItemListaDto) {
    const ok = window.confirm(`Excluir a lista "${c.descricao}"?`);
    if (!ok) return;

    try {
      await this.itemListaService.delete(c.id);
      this.alertService.success('Lista deletada com sucesso!')
      await this.load();
    } catch (e) {
      this.alertService.error('Falha ao deletar. Lista pode estar vinculada a transações.');
    }
  }

  async onDeleteSelected(rows: ItemListaDto[]) {
    if (!rows.length) return;

    const ok = window.confirm(`Excluir ${rows.length} lista(s) selecionada(s)?`);
    if (!ok) {
      if (this.grid) {
        this.grid.deleting = false;
      }
      return;
    }

    try {
      await this.exclusaoEmLote.excluir(
        rows,
        row => this.itemListaService.delete(row.id),
        { singular: 'item', plural: 'itens' }
      );

      this.grid?.clearSelection();
      await this.load();
    } finally {
      if (this.grid) {
        this.grid.deleting = false;
      }
    }
  }
}
