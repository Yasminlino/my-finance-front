import { Component, EventEmitter, Input, OnInit, Output, ViewChild } from '@angular/core';
import { GridColumn, GridColumnOption, GridRowChange } from 'src/app/shared/components/data-grid/data-grid.interface';
import { AlertService } from 'src/app/shared/components/alert.service';
import { GridColumnTypeEnum } from 'src/app/shared/components/data-grid/enum/grid-column.enum';
import { DataGridComponent } from 'src/app/shared/components/data-grid/data-grid.component';
import { formatCurrencyBR} from 'src/app/core/utils/mask';
import { PessoaMovimentacaoService } from 'src/app/core/services/pessoa-movimentacao.service';
import { CategoryService } from 'src/app/core/services/category.service';
import { TipoMovimentacaoService } from 'src/app/core/services/tipo-movimentacao.service';
import { ExtratoBancarioItemService } from 'src/app/core/services/extrato-bancario-item.service';
import { ExibirCamposConfig } from 'src/app/shared/models/utils/grid-config.constants';
import { ExtratoBancarioDto } from 'src/app/core/models/extrato.model';
import { PessoaMovimentacaoDto } from 'src/app/core/models/pessoa-movimentacao.model';
import { concat, finalize, forkJoin, toArray } from 'rxjs';
import { extrairMensagemErro } from 'src/app/core/utils/http-error';


@Component({
  selector: 'app-modal-configuracao-vinculo-pessoa',
  templateUrl: './modal-configuracao-vinculo-pessoa.component.html',
  styleUrls: ['./modal-configuracao-vinculo-pessoa.component.scss'],
})
export class ModalConfiguracaoVinculoPessoaComponent implements OnInit {

  @Input() monthFilter!: string; // pode ser '2026-01-01' ou Date
  @Output() closed = new EventEmitter<boolean>(); // true = salvou algo, false = cancelou
  @Output() 'reload' = new EventEmitter<any[]>();

  pessoaMovimentacao: PessoaMovimentacaoDto[] = [];
  disabledIds = new Set<number>();
  selectedIds = new Set<number>();

  exibirCampos: ExibirCamposConfig | null = null;
  gridColumns: GridColumn[] = []
  categorias: GridColumnOption[] = [];
  movimentacoes: GridColumnOption[] = [];

  loading = false;
  saving = false;
  q = '';

  @ViewChild('grid') grid?: DataGridComponent;
  deletingId: number | null = null;

  constructor(
    private pessoaService: PessoaMovimentacaoService,
    private categoriaService: CategoryService,
    private tipoMovService: TipoMovimentacaoService,
    private extratoBancarioService: ExtratoBancarioItemService,
    private readonly alertService: AlertService,
  ) { }


  ngOnInit() {
    this.setExibirCampos()
    // As colunas usam as opções de categoria e tipo; só monta depois de carregá-las.
    forkJoin({ categorias: this.categoriaService.listarAtivas(), tipos: this.tipoMovService.listar() })
      .subscribe({
        next: ({ categorias, tipos }) => {
          this.categorias = categorias.map(c => ({ label: c.name, value: c.id }));
          this.movimentacoes = tipos.map(t => ({ label: t.nomeTipoMovimentacao || '', value: t.id }));
          this.setGridColumns();
          this.load();
        },
        error: e => this.alertService.error(extrairMensagemErro(e, 'Erro ao carregar categorias e tipos de movimentação.'))
      });
  }

  private setExibirCampos(): void {
    this.exibirCampos = {
      filter: true,
      sortable: true,
      paginator: true,
      buttonNew: true,
      buttonLock: true,
      buttonDeleteLine: true,
    }
  }

  private setGridColumns(): void {
    this.gridColumns = [
      { field: 'nomePessoa', header: 'NOME', type: GridColumnTypeEnum.Text, width: "25%" },
      {
        field: "categoriaId", // <-- Alterado de categoriaName para categoriaId
        header: "CATEGORIA",
        type: GridColumnTypeEnum.Select,
        formatter: (row) => this.categoriaLabel(row.categoriaId),
        options: this.categorias,
        width: '25%',
        editable: true
      },
      {
        field: 'tipoMovimentacaoId', // <-- Alterado de tipoMovimentacaoName para tipoMovimentacaoId
        header: 'TIPO MOVIMENTAÇÃO',
        type: GridColumnTypeEnum.Select,
        formatter: (row) => this.tipoMovimentacaoLabel(row.tipoMovimentacaoId),
        width: "40%",
        editable: true,
        options: this.movimentacoes
      },
      { field: 'actions', header: 'AÇÕES', type: GridColumnTypeEnum.Actions },
    ];
  }

  categoriaLabel(status: any): any {
    return this.categorias.find(c => c.value === status)?.label ?? '-';
  }

  tipoMovimentacaoLabel(status: any): any {
    return this.movimentacoes.find(c => c.value === status)?.label ?? '-';
  }

  addRow() {
    const tempId = -Date.now();
    this.pessoaMovimentacao = [
      {
        id: tempId,
        nomePessoa: '',
        categoriaId: null,
        tipoMovimentacaoId: null
      },
      ...this.pessoaMovimentacao,
    ];
  }

  money(v: any) {
    return formatCurrencyBR(v);
  }

  close(saved = false) {
    this.closed.emit(saved);
  }
  onSaveAll() {
    this.grid?.onSaveAll();
  }

  onSaveInline(changes: GridRowChange[]) {
    if (!changes.length) {
      this.close(true);
      return;
    }

    const gravacoes = changes.map(change => {
      // Mapeia os valores selecionados para garantir que pegamos os IDs corretos.
      const catSelecionada = this.categorias.find(c => c.label === change.changes['categoriaName'] || c.value === change.changes['categoriaId']);
      const movSelecionada = this.movimentacoes.find(m => m.label === change.changes['tipoMovimentacaoName'] || m.value === change.changes['tipoMovimentacaoId']);

      const payload = {
        nomePessoa: (change.changes['nomePessoa'] ?? change.row.nomePessoa ?? '').trim(),
        categoriaId: catSelecionada ? catSelecionada.value : (change.changes['categoriaId'] ?? change.row.categoriaId ?? null),
        tipoMovimentacaoId: movSelecionada ? movSelecionada.value : (change.changes['tipoMovimentacaoId'] ?? change.row.tipoMovimentacaoId ?? null),
        mesAtualizacao: this.monthFilter ?? null,
      };

      // Id negativo é linha nova (criada pelo addRow).
      return change.row.id < 0
        ? this.pessoaService.criar(payload)
        : this.pessoaService.atualizar({ id: change.row.id, ...payload });
    });

    // Uma por vez, na ordem; para no primeiro erro, como antes.
    concat(...gravacoes).pipe(toArray()).subscribe({
      next: () => {
        this.alertService.success(`${changes.length} alteração(ões) salva(s) com sucesso!`);
        this.grid?.clearSelection();
        this.load();
        this.grid?.finishInlineSave();
        this.close(true);
      },
      error: e => this.alertService.error(extrairMensagemErro(e, 'Erro ao salvar as alterações. Tente novamente.'))
    });
  }





  private load() {
    this.loading = true;
    this.pessoaService.listar()
      .pipe(finalize(() => (this.loading = false)))
      .subscribe({
        next: pessoas => {
          this.pessoaMovimentacao = pessoas.map(item => ({
            ...item,
            categoriaName: item.categoria?.name ?? '-',
            tipoMovimentacaoName: item.tipoMovimentacao?.nomeTipoMovimentacao ?? '-',
          }));
        },
        error: e => this.alertService.error(extrairMensagemErro(e, 'Erro ao carregar as pessoas.'))
      });
  }
  deleteRow(r: ExtratoBancarioDto) {
    if (r.id < 0) {
      this.pessoaMovimentacao = this.pessoaMovimentacao.filter(x => x.id !== r.id);
      return;
    }

    if (!confirm(`Excluir cadastro?`)) return;

    this.pessoaService.excluir(r.id)
      .pipe(finalize(() => (this.deletingId = null)))
      .subscribe({
        next: () => {
          this.pessoaMovimentacao = this.pessoaMovimentacao.filter(x => x.id !== r.id);
          this.alertService.success('Registro excluído com sucesso');
        },
        error: e => this.alertService.error(extrairMensagemErro(e, 'Erro ao excluir registro'))
      });
  }
}