import { Component } from '@angular/core';
import { formatCurrencyBR } from 'src/app/core/utils/mask';
import { GridColumn, GridColumnOption } from 'src/app/shared/components/data-grid/data-grid.interface';
import { STATUS_ATIVO_OPTIONS, statusAtivoLabel } from 'src/app/shared/enums/status.enum';
import { GridColumnTypeEnum } from 'src/app/shared/components/data-grid/enum/grid-column.enum';
import { TipoCartao, TipoCartaoService } from 'src/app/core/services/tipo-cartao.service';
import { BancoService } from 'src/app/core/services/banco.service';
import { BancoDto } from 'src/app/core/interfaces/banco.interface';
import { CadastroListBase } from 'src/app/shared/base/cadastro-list.base';

/** Banco com os campos derivados que o grid exibe. */
type BancoLinha = BancoDto & {
  nomeTipoCartaoFormatado: string;
  status: number;
};

@Component({
  selector: 'app-banco-list',
  templateUrl: './banco-list.component.html',
  styleUrls: ['./banco-list.component.scss'],
})
export class BancoListComponent extends CadastroListBase<BancoLinha> {
  protected readonly rotulo = { singular: 'banco', plural: 'bancos' };

  tiposCartao: TipoCartao[] = [];
  tipoCartaoOpcoes: GridColumnOption[] = [];
  statusOptions = STATUS_ATIVO_OPTIONS;
  gridColumns: GridColumn[] = [];
  breadcrumb = [{ label: 'Cadastros' }, { label: 'Bancos' }];

  constructor(private tipoCartaoService: TipoCartaoService, private bancoService: BancoService) {
    super();
  }

  protected override async antesDeCarregar(): Promise<void> {
    await this.getTiposCartao();
    this.setGridColumns();
  }

  protected async buscar(): Promise<BancoLinha[]> {
    const response = await this.bancoService.list();

    return response.map(item => ({
      ...item,
      nomeTipoCartaoFormatado: item.tipoCartao?.nomeTipoCartao ||
        this.tiposCartao.find(t => t.id === item.tipoCartaoId)?.nomeTipoCartao || '-',
      status: item.ativo ? 1 : 0
    }));
  }

  protected excluirRegistro(id: number) {
    return this.bancoService.delete(id);
  }

  protected nomeDe(banco: BancoLinha): string {
    return banco.nomeBanco;
  }

  private async getTiposCartao(): Promise<void> {
    const res = await this.tipoCartaoService.list();

    this.tiposCartao = res;

    this.tipoCartaoOpcoes = res.map(element => ({
      label: element.nomeTipoCartao,
      value: element.nomeTipoCartao
    }));
  }

  private setGridColumns(): void {
    this.gridColumns = [
      { field: 'nomeBanco', header: 'NOME BANCO', type: GridColumnTypeEnum.Text, width: "25%" },
      {
        field: "nomeTipoCartaoFormatado",
        header: "TIPO CARTÃO",
        type: GridColumnTypeEnum.Select,
        options: this.tipoCartaoOpcoes,
        width: '25%',
        editable: false
      },
      {
        field: "saldoInicial",
        header: "SALDO INICIAL",
        type: GridColumnTypeEnum.Money,
        formatter: (row) => formatCurrencyBR(row.saldoInicial),
        width: '20%',
        editable: true
      },
      {
        field: 'status',
        header: 'STATUS',
        type: GridColumnTypeEnum.Select,
        options: this.statusOptions,
        formatter: (row) => statusAtivoLabel(row.status),
        width: "20%"
      },
      { field: 'actions', header: 'AÇÕES', type: GridColumnTypeEnum.Actions, functions: ['edit', 'delete'] },
    ];
  }
}
