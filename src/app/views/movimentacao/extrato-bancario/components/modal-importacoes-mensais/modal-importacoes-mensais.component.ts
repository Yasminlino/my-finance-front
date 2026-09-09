import { Component, EventEmitter, Input, OnDestroy, OnInit, Output, ViewChild } from '@angular/core';
import { ExibirCampos, GridColumn, GridColumnOption } from 'src/app/shared/components/data-grid/data-grid.interface';
import { AlertService } from 'src/app/shared/components/alert.service';
import { GridColumnTypeEnum } from 'src/app/shared/components/data-grid/enum/grid-column.enum';
import { DataGridComponent } from 'src/app/shared/components/data-grid/data-grid.component';
import { Subscription } from 'rxjs';
import { AccountDto, ContaService } from 'src/app/core/services/contas.service';
import { ContaMensal } from 'src/app/core/models/conta-mensal.model';
import { formatCurrencyBR, formatDateVencimento, formatDateVencimentoView, removeFormatCurrencyBR } from 'src/app/core/utils/mask';
import { ExtratoBancarioDto, ExtratoBancarioService } from 'src/app/core/services/extrato-bancario.service';


@Component({
  selector: 'app-modal-importacoes-mensais',
  templateUrl: './modal-importacoes-mensais.component.html',
  styleUrls: ['./modal-importacoes-mensais.component.scss'],
})
export class ModalImportacoesMensaisComponent implements OnInit {
  @Input() monthFilter!: string; // pode ser '2026-01-01' ou Date
  @Output() closed = new EventEmitter<boolean>(); // true = salvou algo, false = cancelou
  @Output() 'reload' = new EventEmitter<any[]>();

  importacaoesMensais: ExtratoBancarioDto[] = [];
  disabledIds = new Set<number>();
  selectedIds = new Set<number>();

  exibirCampos: ExibirCampos | null = null;
  gridColumns: GridColumn[] = []

  loading = false;
  saving = false;
  q = '';

  showModalForm = false;
  @ViewChild('grid') grid?: DataGridComponent;  
  deletingId: number | null = null;

  constructor(
    private readonly extratobancarioService: ExtratoBancarioService,
    private readonly alertService: AlertService,
  ) { }


  async ngOnInit() {
    this.setGridColumns()
    this.setExibirCampos()
    await this.load();
  }

  private setExibirCampos(): void {
    this.exibirCampos = {
      filter: true,
      sortable: true,
      selected: false,
      paginator: false,
      buttonDeleteAll: false,
      buttonNew: false,
      buttonLock: false,
      buttonPopUp: false,
      buttonEditLine: false,
      buttonDeleteLine: true,
      buttonSaveCancel: false,
    }
  }

  private setGridColumns(): void {

    this.gridColumns = [
      { field: 'dataImportacao', header: 'DATA IMPORTAÇÃO', type: GridColumnTypeEnum.Text, width: "15%" }, 
      { field: 'bancoNome', header: 'BANCO IMPORTAÇÃO', type: GridColumnTypeEnum.Text, width: "15%" }, 
      { field: 'nomeArquivoOrigem', header: 'NOME ARQUIVO', type: GridColumnTypeEnum.Text, width: "40%" }, 
      { field: 'quantidadeLancamentos', header: 'QUANTIDADE DE REGISTROS', type: GridColumnTypeEnum.Number, width: "20%" }, 
      { field: 'actions', header: 'AÇÕES', type: GridColumnTypeEnum.Actions}, 
      
    ];
  }

  money(v: any) {
    return formatCurrencyBR(v);
  }

  close(saved = false) {
    this.closed.emit(saved);
  }


  private async load() {
    this.loading = true;
    try {

      var response = await this.extratobancarioService.listExtratos(this.monthFilter)

      this.importacaoesMensais = response.map(item => ({
        ...item,
        dataImportacao: formatDateVencimentoView(item.dataImportacao),
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
      this.importacaoesMensais = this.importacaoesMensais.filter(x => x.id !== r.id);
      return;
    }

    if (!confirm(`Excluir "${r.nomeArquivoOrigem}"?`)) return;

    try {
      await this.extratobancarioService.deleteExtrato(r.id);
      this.importacaoesMensais = this.importacaoesMensais.filter(x => x.id !== r.id);
      this.alertService.success('Registro excluído com sucesso');
    } catch (e: any) {
      this.alertService.error(e?.error?.message ?? 'Erro ao excluir registro');
    } finally {
      this.deletingId = null;
    }
  }
}