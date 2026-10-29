
import { Component, DestroyRef, OnInit, ViewChild, inject } from '@angular/core';
import { ConfirmacaoService } from 'src/app/core/services/confirmacao.service';
import { DataGridComponent } from 'src/app/shared/components/data-grid/data-grid.component';
import { GridColumn, GridColumnOption } from 'src/app/shared/components/data-grid/data-grid.interface';
import { GridColumnTypeEnum } from 'src/app/shared/components/data-grid/enum/grid-column.enum';
import { rotaDaLista } from '../listas.regras';
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

  /** Tela provisória até o card #63: o tipo virou modelo, e as arquivadas não aparecem aqui. */
  readonly opcoesModelo: GridColumnOption[] = [
    { label: 'Compras', value: 'COMPRAS' },
    { label: 'Orçamento', value: 'ORCAMENTO' },
    { label: 'Tarefas', value: 'TAREFAS' },
    { label: 'Agenda', value: 'AGENDA' },
    { label: 'Em branco', value: 'BRANCO' }
  ];

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
        field: 'modelo',
        header: 'MODELO',
        type: GridColumnTypeEnum.Select,
        options: this.opcoesModelo,
        width: "30%"
      },
      {
        field: 'resumo',
        header: 'ITENS',
        type: GridColumnTypeEnum.Text,
        formatter: (row) => `${row.resumo?.feitos ?? 0} de ${row.resumo?.itens ?? 0}`,
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
    this.router.navigate(rotaDaLista(item));
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
