import { Component, DestroyRef, OnInit, ViewChild, inject } from '@angular/core';
import { DataGridComponent } from 'src/app/shared/components/data-grid/data-grid.component';
import { GridColumn, GridColumnOption } from 'src/app/shared/components/data-grid/data-grid.interface';
import { AlertService } from 'src/app/shared/components/alert.service';
import { ExclusaoEmLoteService } from 'src/app/core/services/exclusao-em-lote.service';
import { ListaService } from 'src/app/core/services/lista.service';
import { ActivatedRoute, Router } from '@angular/router';
import { ItemListaService } from 'src/app/core/services/item-lista.service';
import { TipoLista } from 'src/app/shared/enums/tipo-lista.enum';
import { GridColumnTypeEnum } from 'src/app/shared/components/data-grid/enum/grid-column.enum';
import { formatCurrencyBR } from 'src/app/core/utils/mask';
import { TagStatus } from 'src/app/shared/enums/status.enum';
import { EXIBIR_CAMPOS_CADASTRO, ExibirCamposConfig } from 'src/app/shared/models/utils/grid-config.constants';
import { ItemListaDto } from 'src/app/core/models/lista.model';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { finalize, forkJoin } from 'rxjs';
import { extrairMensagemErro } from 'src/app/core/utils/http-error';



@Component({
  selector: 'app-lista-de-orcamento',
  templateUrl: './lista-de-orcamento.component.html',
  styleUrls: ['./lista-de-orcamento.component.scss'],
})
export class ListaDeOrcamentoComponent implements OnInit {
  @ViewChild('grid') grid?: DataGridComponent;
  private readonly destroyRef = inject(DestroyRef);

  itensLista: ItemListaDto[] = [];
  
  exibirCampos: ExibirCamposConfig = { ...EXIBIR_CAMPOS_CADASTRO, buttonViewLine: true };
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

  constructor(private itemListaService: ItemListaService, private listaService: ListaService, private readonly alertService: AlertService, private readonly exclusaoEmLote: ExclusaoEmLoteService, private readonly router: Router, private readonly route: ActivatedRoute) { }

  ngOnInit() {
    this.setGridColumns();
    this.load();
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
        header: 'OBSERVAÇÃO',
        type: GridColumnTypeEnum.TextArea,
        width: "25%"
      },
      {
        field: "status",
        header: "STATUS",
        type: GridColumnTypeEnum.Select,
        options: this.statusOptions,
        width: '17%'
      },
      { field: 'actions', header: 'AÇÕES', type: GridColumnTypeEnum.Actions, functions: ['edit', 'delete'] },
    ]
  }

  load() {
    this.listaId = Number(this.route.snapshot.paramMap.get('id'));

    this.loading = true;
    forkJoin({ itens: this.itemListaService.listarDaLista(this.listaId), lista: this.listaService.obterPorId(this.listaId) })
      .pipe(finalize(() => (this.loading = false)), takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: ({ itens, lista }) => {
          this.itensLista = itens;
          this.lista = [...itens];
          this.titulo = lista?.nome ?? 'Orçamento';
          this.applyFilters();
        },
        error: e => this.alertService.error(extrairMensagemErro(e, 'Erro ao carregar os itens do orçamento.'))
      });
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
