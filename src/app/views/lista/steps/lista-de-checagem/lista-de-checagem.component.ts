import { Component, OnInit, ViewChild } from '@angular/core';
import { DataGridComponent } from 'src/app/shared/components/data-grid/data-grid.component';
import { ExibirCampos, GridColumn, GridColumnOption } from 'src/app/shared/components/data-grid/data-grid.interface';
import { TagStatus } from 'src/app/shared/enums/status.enum';
import { AlertService } from 'src/app/shared/components/alert.service';
import { ActivatedRoute, Router } from '@angular/router';
import { ItemListaService, ItemListaDto } from 'src/app/core/services/item-lista.service';
import { ListaService } from 'src/app/core/services/lista.service';

@Component({
  selector: 'app-lista-de-checagem',
  templateUrl: './lista-de-checagem.component.html',
  styleUrls: ['./lista-de-checagem.component.scss']
})
export class ListaDeChecagemComponent implements OnInit {

  itemListas: ItemListaDto[] = [];
  exibirCampos: ExibirCampos | null = null;
  gridColumns: GridColumn[] = [];

  statusOptions: GridColumnOption[] = [
    { label: 'CONCLUIDO', value: 'CONCLUIDO', classe: TagStatus.Success },
    { label: 'PENDENTE', value: 'PENDENTE', classe: TagStatus.Warning }
  ];
  listaId: string | null = null;

  statusLabel(value: string): boolean {
    return value === 'CONCLUIDO' ? true : false;
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

  constructor(private itemListaService: ItemListaService, private readonly listaService: ListaService, private readonly alertService: AlertService, private readonly router: Router, private readonly route: ActivatedRoute) { }

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
      { field: 'descricao', header: 'DESCRIÇÃO', type: 'text', width: "35%", classe: (row) => row.status == "CONCLUIDO" ? 'text-success' : 'text-danger' },
      { field: 'quantidade', header: 'QUANTIDADE', type: 'number', width: "30%", classe: (row) => row.status == "CONCLUIDO" ? 'text-success' : 'text-danger' },
      { field: 'actions', header: 'Ações', type: 'actions', functions: ['edit', 'delete'] },
    ]
  }

  private setExibirCampos(): void {
    this.exibirCampos = {
      filter: false,
      sortable: true,
      selected: false,
      paginator: true,
      buttonDeleteAll: false,
      buttonNew: true,
      buttonLock: false,
      buttonPopUp: false,
      buttonViewLine: false,
      buttonEditLine: true,
      buttonDeleteLine: true,
      buttonSaveCancel: false,
    }
  }

  async load() {
    try {
      this.loading = true;
      this.listaId = this.route.snapshot.paramMap.get('id')
      this.itemListas = (await this.itemListaService.GetItemListaById(Number(this.listaId))).map(i => ({
        ...i,
        statusBoolean: i.status === 'CONCLUIDO'
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
    const novoStatus = item.status === 'CONCLUIDO' ? 'PENDENTE' : 'CONCLUIDO';

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
      var response;
      for (const row of rows) {
        response = await this.itemListaService.delete(row.id);
      }

      if (response) {
        this.alertService.success(`${rows.length} lista(s) excluída(s) com sucesso!`);
      }

      this.grid?.clearSelection();
      await this.load();
    } catch (e) {
      this.alertService.error(`'${rows.length}' itens deram erros ao deletar!`);
    } finally {
      if (this.grid) {
        this.grid.deleting = false;
      }
    }
  }
}
