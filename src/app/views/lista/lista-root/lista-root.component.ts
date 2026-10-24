
import { Component, DestroyRef, OnInit, ViewChild, inject } from '@angular/core';
import { ConfirmacaoService } from 'src/app/core/services/confirmacao.service';
import { DataGridComponent } from 'src/app/shared/components/data-grid/data-grid.component';
import { GridColumn, GridColumnOption } from 'src/app/shared/components/data-grid/data-grid.interface';
import { GridColumnTypeEnum } from 'src/app/shared/components/data-grid/enum/grid-column.enum';
import { TagStatus } from 'src/app/shared/enums/status.enum';
import { AlertService } from 'src/app/shared/components/alert.service';
import { ExclusaoEmLoteService } from 'src/app/core/services/exclusao-em-lote.service';
import { ListaService } from 'src/app/core/services/lista.service';
import { Router } from '@angular/router';
import { EXIBIR_CAMPOS_CADASTRO, ExibirCamposConfig } from 'src/app/shared/models/utils/grid-config.constants';
import { ListaDto } from 'src/app/core/models/lista.model';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { finalize } from 'rxjs';
import { extrairMensagemErro } from 'src/app/core/utils/http-error';

@Component({
  selector: 'app-lista-root',
  templateUrl: './lista-root.component.html',
  styleUrls: ['./lista-root.component.scss'],
})
export class ListaRootComponent implements OnInit {
  listas: ListaDto[] = [];
  exibirCampos: ExibirCamposConfig = { ...EXIBIR_CAMPOS_CADASTRO, buttonViewLine: true };
  gridColumns: GridColumn<ListaDto>[] = [];

  statusOptions: GridColumnOption[] = [
    { label: 'Ativo', value: true, classe: TagStatus.Success },
    { label: 'Inativo', value: false, classe: TagStatus.Secondary }
  ];

  statusLabel(value: boolean): string {
    return value === true ? 'Ativo' : 'Inativo';
  }

  lista: ListaDto[] = [];
  breadcrumb = [{ label: 'Listas' }, { label: 'Listas' }]

  loading = false;

  showModalCreate = false;
  showModalUpdate = false;

  editing: ListaDto | null = null;
  @ViewChild('grid') grid?: DataGridComponent<ListaDto>;
  private readonly destroyRef = inject(DestroyRef);
  private readonly confirmacao = inject(ConfirmacaoService);

  constructor(private listaService: ListaService, private readonly alertService: AlertService, private readonly exclusaoEmLote: ExclusaoEmLoteService, private readonly router: Router) { }

  ngOnInit() {
    this.setGridColumns();
    this.load();
  }

  private setGridColumns(): void {
    this.gridColumns = [
      { field: 'nome', header: 'NOME', type: GridColumnTypeEnum.Text, width: "40%" },
      {
        field: 'tipoMovimentacao',
        header: 'TIPO',
        type: GridColumnTypeEnum.Select,
        options: [
          { label: 'Checklist', value: 1 },
          { label: 'Cronograma', value: 2 },
          { label: 'Orçamento', value: 3 }
        ],
        width: "30%"
      },
      {
        field: 'ativo',
        header: 'STATUS',
        type: GridColumnTypeEnum.Select,
        options: this.statusOptions,
        formatter: (row) => this.statusLabel(row.ativo),
        width: "20%"
      },
      { field: 'actions', header: 'AÇÕES', type: GridColumnTypeEnum.Actions, functions: ['view', 'edit', 'delete'] },
    ]
  }

  load() {
    this.loading = true;
    this.listaService.listar()
      .pipe(finalize(() => (this.loading = false)), takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: listas => {
          this.listas = listas;
          this.applyFilters();
        },
        error: e => this.alertService.error(extrairMensagemErro(e, 'Erro ao carregar listas.'))
      });
  }

  applyFilters() {
    this.lista = [...this.listas].sort((a, b) => (a.nome ?? '').localeCompare(b.nome ?? ''));
  }

  openCreate() {
    this.editing = null;
    this.showModalCreate = true;
  }

  onEdit(lista: ListaDto) {
    this.editing = lista;
    this.showModalUpdate = true;
  }

  abrirItemLista(item: ListaDto) {
    if (!item.tipoMovimentacao) return;
    if (item.tipoMovimentacao === 1) {
      this.router.navigate([`/listas/${item.id}/checagem`]);
    } else if (item.tipoMovimentacao === 2) {
      window.open(`/#/listas/${item.id}/cronograma`, '_blank');
    } else if (item.tipoMovimentacao === 3) {
      this.router.navigate([`/listas/${item.id}/orcamento`]);
    }
    // Outros tipos não têm tela. Antes abria "/catalogos-listas/:id" sem o "#", que saía do app.

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

  async onDelete(c: ListaDto) {
    const ok = await this.confirmacao.confirmar(`Excluir a lista "${c.nome}"?`);
    if (!ok) return;

    this.listaService.excluir(c.id).subscribe({
      next: () => {
        this.alertService.success('Lista excluída com sucesso!');
        this.load();
      },
      error: e => this.alertService.error(extrairMensagemErro(e, 'Falha ao excluir. A lista pode ter itens vinculados.'))
    });
  }

  onDeleteSelected(rows: ListaDto[]) {
    this.exclusaoEmLote
      .confirmarEExcluir(this.grid, rows, row => this.listaService.excluir(row.id), { singular: 'lista', plural: 'listas', feminino: true })
      .subscribe(excluiu => {
        if (excluiu) this.load();
      });
  }
}
