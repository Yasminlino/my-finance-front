import { Component, EventEmitter, Input, OnDestroy, OnInit, Output, ViewChild } from '@angular/core';
import { GridColumn } from 'src/app/shared/components/data-grid/data-grid.interface';
import { AlertService } from 'src/app/shared/components/alert.service';
import { GridColumnTypeEnum } from 'src/app/shared/components/data-grid/enum/grid-column.enum';
import { DataGridComponent } from 'src/app/shared/components/data-grid/data-grid.component';
import { formatCurrencyBR, formatDateBR } from 'src/app/core/utils/mask';
import { ExtratoBancarioService } from 'src/app/core/services/extrato-bancario.service';
import { ExibirCamposConfig } from 'src/app/shared/models/utils/grid-config.constants';
import { ExtratoBancarioDto } from 'src/app/core/models/extrato.model';
import { finalize } from 'rxjs';
import { extrairMensagemErro } from 'src/app/core/utils/http-error';


@Component({
  selector: 'app-modal-importacoes-mensais',
  templateUrl: './modal-importacoes-mensais.component.html',
})
export class ModalImportacoesMensaisComponent implements OnInit {
  @Input() monthFilter!: string; // pode ser '2026-01-01' ou Date
  @Output() closed = new EventEmitter<boolean>(); // true = salvou algo, false = cancelou
  @Output() 'reload' = new EventEmitter<any[]>();

  importacaoesMensais: ExtratoBancarioDto[] = [];
  disabledIds = new Set<number>();
  selectedIds = new Set<number>();

  exibirCampos: ExibirCamposConfig | null = null;
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


  ngOnInit() {
    this.setGridColumns()
    this.setExibirCampos()
    this.load();
  }

  private setExibirCampos(): void {
    this.exibirCampos = {
      filter: true,
      sortable: true,
      buttonDeleteLine: true
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


  private load() {
    this.loading = true;
    this.extratobancarioService.listarDoMes(this.monthFilter)
      .pipe(finalize(() => (this.loading = false)))
      .subscribe({
        next: extratos => {
          this.importacaoesMensais = extratos.map(item => ({
            ...item,
            dataImportacao: formatDateBR(item.dataImportacao),
          }));
        },
        error: e => this.alertService.error(extrairMensagemErro(e, 'Erro ao carregar as importações do mês.'))
      });
  }
  deleteRow(r: ExtratoBancarioDto) {
    if (r.id < 0) {
      this.importacaoesMensais = this.importacaoesMensais.filter(x => x.id !== r.id);
      return;
    }

    if (!confirm(`Excluir "${r.nomeArquivoOrigem}"?`)) return;

    this.extratobancarioService.excluir(r.id)
      .pipe(finalize(() => (this.deletingId = null)))
      .subscribe({
        next: () => {
          this.importacaoesMensais = this.importacaoesMensais.filter(x => x.id !== r.id);
          this.alertService.success('Registro excluído com sucesso');
        },
        error: e => this.alertService.error(extrairMensagemErro(e, 'Erro ao excluir registro'))
      });
  }
}