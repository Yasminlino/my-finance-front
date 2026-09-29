import { Component, OnInit, ViewChild } from '@angular/core';
import { DataGridComponent } from 'src/app/shared/components/data-grid/data-grid.component';
import { ExibirCampos, GridColumn, GridColumnOption } from 'src/app/shared/components/data-grid/data-grid.interface';
import { AlertService } from 'src/app/shared/components/alert.service';
import { ListaDto, ListaService } from 'src/app/core/services/lista.service';
import { ActivatedRoute, Router } from '@angular/router';
import { ItemListaDto, ItemListaService } from 'src/app/core/services/item-lista.service';
import { TipoLista } from 'src/app/shared/enums/tipo-lista.enum';
import { GridColumnTypeEnum } from 'src/app/shared/components/data-grid/enum/grid-column.enum';
import { formatCurrencyBR } from 'src/app/core/utils/mask';
import { TagStatus } from 'src/app/shared/enums/status.enum';



@Component({
  selector: 'app-lista-de-orcamento',
  templateUrl: './lista-de-orcamento.component.html',
  styleUrls: ['./lista-de-orcamento.component.scss'],
})
export class ListaDeOrcamentoComponent implements OnInit {
  @ViewChild('grid') grid?: DataGridComponent;

  itensLista: ItemListaDto[] = [];
  exibirCampos: ExibirCampos | null = null;
  gridColumns: GridColumn[] = [];
  tipoLista = TipoLista.Orcamento;
  lista: ItemListaDto[] = [];
  listaId: number = 0;
  titulo: string = 'Orçamento';
  breadcrumb = [{ label: 'Catalago' }, { label: 'Orçamento' }]

  loading = false;
  errorMsg = '';
  statusU: string[] = [];
  statusOptions: GridColumnOption[] = [
    { label: 'OK', value: 'OK', classe: TagStatus.Success },
    { label: 'AGUARDANDO', value: 'AGUARDANDO', classe: TagStatus.Warning },
    { label: 'PENDENTE', value: 'PENDENTE', classe: TagStatus.Danger }
  ];

  q = '';
  selectedTotals = { receita: 0, despesa: 0, saldo: 0, count: 0 };

  showModalCreateItem = false;
  showModalUpdateItem = false;


  editing: ItemListaDto | null = null;
  situacoes: string[] = [];
  totalPorSituacao: { situacao: string | undefined; valorTotal: number; }[] = [];

  constructor(private itemListaService: ItemListaService, private listaService: ListaService, private readonly alertService: AlertService, private readonly router: Router, private readonly route: ActivatedRoute) { }

  async ngOnInit() {
    await this.load();
    this.setExibirCampos()
    this.setGridColumns();
  }

  money(v: any) { return formatCurrencyBR(v); }

  private setGridColumns(): void {
    this.gridColumns = [
      { field: 'descricao', header: 'DESCRIÇÃO', type: GridColumnTypeEnum.Text, width: "30%" },
      {
        field: 'valor',
        header: 'VALOR',
        type: GridColumnTypeEnum.Money,
        formatter: (row) => this.money(row.valor),
        width: "15%"
      },
      {
        field: 'observacao',
        header: 'OBS.',
        type: GridColumnTypeEnum.TextArea,
        width: "25%"
      },
      {
        field: "status",
        header: "Status",
        type: GridColumnTypeEnum.Select,
        options: this.statusOptions,
        width: '17%'
      },
      { field: 'actions', header: 'Ações', type: 'actions', functions: ['edit', 'delete'] },
    ]
  }

  private setExibirCampos(): void {
    this.exibirCampos = {
      filter: true,
      sortable: true,
      selected: true,
      paginator: true,
      buttonDeleteAll: true,
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
      this.listaId = Number(this.route.snapshot.paramMap.get('id'));
      this.itensLista = await this.itemListaService.GetItemListaById(Number(this.listaId));      
      this.lista = [...this.itensLista]; 
      const listaObj = await this.listaService.GetListaById(this.listaId);
      this.titulo = listaObj?.nome ?? 'Orçamento';
      console.log('Listas carregadas:', this.itensLista);
      this.applyFilters();
    } catch (e: any) {
      this.alertService.error(e?.message ?? 'Erro ao carregar listas.');
    } finally {
      this.loading = false;
    }
  }

  calculaTotal() {
    const situacoesUnicas = Array.from(new Set(this.itensLista.map(i => i.status).filter(Boolean))) as string[];
    this.statusU = situacoesUnicas;


    this.totalPorSituacao = this.itensLista.some(item => item.valor)
      ? situacoesUnicas.map(situacao => {
        const valorTotal = this.itensLista
          .filter(item => item.status === situacao)
          .reduce((total, item) => total + (item.valor ?? 0), 0);
        return { situacao, valorTotal };
      })
      : [];
  }

  applyFilters() {
    const term = this.q.trim().toLowerCase();

    this.lista = [...this.itensLista]
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

  onSelectionChange(selectedItems: ItemListaDto[]) {
    let receita = 0;
    let despesa = 0;

    selectedItems.forEach((item) => {
      const val = item.valor || 0;
      const sub = String(item.status || '').toLowerCase();
      if (sub === 'ok') receita += val;
      if (sub === "aguardando" || sub === "pendente") despesa += val;
    });

    this.selectedTotals = { receita, despesa, saldo: receita - despesa, count: selectedItems.length };
  }

  openCreate() {
    this.editing = null;
    this.showModalCreateItem = true;
  }

  onEdit(lista: ItemListaDto) {
    this.editing = lista;
    this.showModalUpdateItem = true;
  }


  closeCreate(reload: boolean) {
    this.showModalCreateItem = false;
    if (reload) this.load();
  }

  closeEdit(reload: boolean) {
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
