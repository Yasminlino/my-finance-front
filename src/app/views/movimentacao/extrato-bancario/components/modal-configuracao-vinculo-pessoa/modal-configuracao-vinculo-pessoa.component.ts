import { Component, EventEmitter, Input, OnDestroy, OnInit, Output, ViewChild } from '@angular/core';
import { ExibirCampos, GridColumn, GridColumnOption, GridRowChange } from 'src/app/shared/components/data-grid/data-grid.interface';
import { AlertService } from 'src/app/shared/components/alert.service';
import { GridColumnTypeEnum } from 'src/app/shared/components/data-grid/enum/grid-column.enum';
import { DataGridComponent } from 'src/app/shared/components/data-grid/data-grid.component';
import { Subscription } from 'rxjs';
import { AccountDto, ContaService } from 'src/app/core/services/contas.service';
import { ContaMensal } from 'src/app/core/models/conta-mensal.model';
import { formatCurrencyBR, formatDateVencimento, formatDateVencimentoView, removeFormatCurrencyBR } from 'src/app/core/utils/mask';
import { ExtratoBancarioDto, ExtratoBancarioService } from 'src/app/core/services/extrato-bancario.service';
import { PessoaMovimentacaoDto, PessoaMovimentacaoService } from 'src/app/core/services/pessoa-movimentacao.service';
import { CategoryService } from 'src/app/core/services/category.service';
import { TipoMovimentacaoService } from 'src/app/core/services/tipo-movimentacao.service';
import { ExtratoBancarioItemService } from 'src/app/core/services/extrato-bancario-item.service';


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

  exibirCampos: ExibirCampos | null = null;
  gridColumns: GridColumn[] = []
  categorias: GridColumnOption[] = [];
  movimentacoes: GridColumnOption[] = [];

  loading = false;
  saving = false;
  q = '';

  showModalForm = false;
  @ViewChild('grid') grid?: DataGridComponent;
  deletingId: number | null = null;

  constructor(
    private pessoaService: PessoaMovimentacaoService,
    private categoriaService: CategoryService,
    private tipoMovService: TipoMovimentacaoService,
    private extratoBancarioService: ExtratoBancarioItemService,
    private readonly alertService: AlertService,
  ) { }


  async ngOnInit() {
    await this.getCategorias();
    await this.getMovimentacoes();
    this.setGridColumns()
    this.setExibirCampos()
    await this.load();
  }

  private setExibirCampos(): void {
    this.exibirCampos = {
      filter: true,
      sortable: true,
      selected: false,
      paginator: true,
      buttonDeleteAll: false,
      buttonNew: true,
      buttonLock: true,
      buttonPopUp: false,
      buttonEditLine: false,
      buttonDeleteLine: true,
      buttonSaveCancel: false,
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
        tipoMovimentacaoId: null,
        categoriaName: '-',
        tipoMovimentacaoName: '-'    // Necessário para o grid exibir o select corretamente
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
  async onSaveAll() {
    this.grid?.onSaveAll();
  }

  async onSaveInline(changes: GridRowChange[]) {
    if (!changes.length) {
      this.close(true);
      return;
    }

    try {
      for (const change of changes) {
        // Mapeia os valores selecionados para garantir que pegamos os IDs corretos
        const catSelecionada = this.categorias.find(c => c.label === change.changes['categoriaName'] || c.value === change.changes['categoriaId']);
        const movSelecionada = this.movimentacoes.find(m => m.label === change.changes['tipoMovimentacaoName'] || m.value === change.changes['tipoMovimentacaoId']);

        const payload = {
          nomePessoa: (change.changes['nomePessoa'] ?? change.row.nomePessoa ?? '').trim(),
          categoriaId: catSelecionada ? catSelecionada.value : (change.changes['categoriaId'] ?? change.row.categoriaId ?? null),
          tipoMovimentacaoId: movSelecionada ? movSelecionada.value : (change.changes['tipoMovimentacaoId'] ?? change.row.tipoMovimentacaoId ?? null),
          mesAtualizacao: this.monthFilter ?? null,
        };

        if (change.row.id < 0) {
          // ID negativo significa que a linha é nova -> Chamar criação
          await this.pessoaService.create({ // Ajuste o nome do método caso seja insert/save no seu service
            ...payload
          });
        } else {
          // ID positivo -> Atualização normal
          await this.pessoaService.update(change.row.id, {
            id: change.row.id,
            ...payload
          });
        }
      }

      this.alertService.success(`${changes.length} alteração(ões) salva(s) com sucesso!`);
      this.grid?.clearSelection();
      await this.load();
      this.grid?.finishInlineSave();
      this.close(true);

    } catch (e) {
      console.error(e);
      this.alertService.error('Erro ao salvar as alterações. Tente novamente.');
    }
  }

  private async getCategorias(): Promise<void> {
    const res = await this.categoriaService.buscarCategoriasAtivas();

    this.categorias = res.map(element => ({
      label: element.name,
      value: element.id
    }));
  }

  private async getMovimentacoes(): Promise<void> {
    const res = await this.tipoMovService.list();

    this.movimentacoes = res.map(element => ({
      label: element.nomeTipoMovimentacao || '',
      value: element.id
    }));
  }

  private async load() {
    this.loading = true;
    try {

      var response = await this.pessoaService.list()
      this.pessoaMovimentacao = response.map(item => ({
        ...item,
        categoriaName: item.categoria?.name ?? '-',
        tipoMovimentacaoName: item.tipoMovimentacao?.nomeTipoMovimentacao ?? '-',
      }));
    } catch (e) {
      console.error(e);
      this.alertService.error('Erro ao carregar contas cadastradas')
    } finally {
      this.loading = false;
    }
  }
  async deleteRow(r: ExtratoBancarioDto) {
    if (r.id < 0) {
      this.pessoaMovimentacao = this.pessoaMovimentacao.filter(x => x.id !== r.id);
      return;
    }

    if (!confirm(`Excluir cadastro?`)) return;

    try {
      await this.pessoaService.delete(r.id);
      this.pessoaMovimentacao = this.pessoaMovimentacao.filter(x => x.id !== r.id);
      this.alertService.success('Registro excluído com sucesso');
    } catch (e: any) {
      this.alertService.error(e?.error?.message ?? 'Erro ao excluir registro');
    } finally {
      this.deletingId = null;
    }
  }
}