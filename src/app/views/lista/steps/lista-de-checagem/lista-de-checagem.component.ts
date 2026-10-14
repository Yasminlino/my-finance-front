import { Component, DestroyRef, OnInit, ViewChild, inject } from '@angular/core';
import { DataGridComponent } from 'src/app/shared/components/data-grid/data-grid.component';
import { GridColumn, GridColumnOption } from 'src/app/shared/components/data-grid/data-grid.interface';
import { GridColumnTypeEnum } from 'src/app/shared/components/data-grid/enum/grid-column.enum';
import { TagStatus } from 'src/app/shared/enums/status.enum';
import { AlertService } from 'src/app/shared/components/alert.service';
import { ExclusaoEmLoteService } from 'src/app/core/services/exclusao-em-lote.service';
import { ActivatedRoute, Router } from '@angular/router';
import { ItemListaService } from 'src/app/core/services/item-lista.service';
import { ListaService } from 'src/app/core/services/lista.service';
import { ExibirCamposConfig } from 'src/app/shared/models/utils/grid-config.constants';
import { ItemListaDto } from 'src/app/core/models/lista.model';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { finalize, forkJoin } from 'rxjs';
import { extrairMensagemErro } from 'src/app/core/utils/http-error';

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
  listaId: number = 0;

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
  private readonly destroyRef = inject(DestroyRef);

  constructor(private itemListaService: ItemListaService, private readonly listaService: ListaService, private readonly alertService: AlertService, private readonly exclusaoEmLote: ExclusaoEmLoteService, private readonly router: Router, private readonly route: ActivatedRoute) { }

  ngOnInit() {
    this.setExibirCampos()
    this.setGridColumns();
    this.load();
  }

  private setGridColumns(): void {
    this.gridColumns = [
      {
        field: 'statusBoolean',
        header: 'STATUS',
        formatter: (row) => this.statusLabel(row.status),
        type: GridColumnTypeEnum.Checkbox,
        width: '5%'
      },
      { field: 'descricao', header: 'DESCRIÇÃO', type: GridColumnTypeEnum.Text, width: "35%", classe: (row) => row.status == "OK" ? 'text-success' : 'text-danger' },
      { field: 'quantidade', header: 'QUANTIDADE', type: GridColumnTypeEnum.Number, width: "30%", classe: (row) => row.status == "OK" ? 'text-success' : 'text-danger' },
      { field: 'actions', header: 'AÇÕES', type: GridColumnTypeEnum.Actions, functions: ['edit', 'delete'] },
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

  load() {
    this.listaId = Number(this.route.snapshot.paramMap.get('id'));

    this.loading = true;
    forkJoin({ itens: this.itemListaService.listarDaLista(this.listaId), lista: this.listaService.obterPorId(this.listaId) })
      .pipe(finalize(() => (this.loading = false)), takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: ({ itens, lista }) => {
          this.itemListas = itens.map(i => ({ ...i, statusBoolean: i.status === 'OK' }));
          this.titulo = lista.nome;
          this.applyFilters();
        },
        error: e => this.alertService.error(extrairMensagemErro(e, 'Erro ao carregar os itens da lista.'))
      });
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

  toggleConcluido(linha: ItemListaDto) {
    const anteriores = this.itemListas;
    const status = linha.status === 'OK' ? 'PENDENTE' : 'OK';
    const item = { ...(anteriores.find(i => i.id === linha.id) ?? linha), status, statusBoolean: status === 'OK' };

    // Array novo: o grid (OnPush) remonta a linha com o status e a cor novos (FE-P2-09).
    this.itemListas = anteriores.map(i => (i.id === item.id ? item : i));
    this.itemListaService.atualizar(item).subscribe({
      error: () => (this.itemListas = anteriores) // desfaz na tela, inclusive o checkbox
    });
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

  onDelete(c: ItemListaDto) {
    const ok = window.confirm(`Excluir o item "${c.descricao}"?`);
    if (!ok) return;

    this.itemListaService.excluir(c.id).subscribe({
      next: () => {
        this.alertService.success('Item excluído com sucesso!');
        this.load();
      },
      error: e => this.alertService.error(extrairMensagemErro(e, 'Falha ao excluir o item.'))
    });
  }

  onDeleteSelected(rows: ItemListaDto[]) {
    this.exclusaoEmLote
      .confirmarEExcluir(this.grid, rows, row => this.itemListaService.excluir(row.id), { singular: 'item', plural: 'itens' })
      .subscribe(excluiu => {
        if (excluiu) this.load();
      });
  }
}
