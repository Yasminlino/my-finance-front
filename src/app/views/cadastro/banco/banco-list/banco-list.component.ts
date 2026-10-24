import { Component } from '@angular/core';
import { formatCurrencyBR } from 'src/app/core/utils/mask';
import { GridColumn, GridColumnOption } from 'src/app/shared/components/data-grid/data-grid.interface';
import { STATUS_ATIVO_OPTIONS, statusAtivoLabel } from 'src/app/shared/enums/status.enum';
import { GridColumnTypeEnum } from 'src/app/shared/components/data-grid/enum/grid-column.enum';
import { TipoCartaoService } from 'src/app/core/services/tipo-cartao.service';
import { BancoService } from 'src/app/core/services/banco.service';
import { CadastroListBase } from 'src/app/shared/base/cadastro-list.base';
import { BancoDto } from 'src/app/core/models/banco.model';
import { TipoCartaoDto } from 'src/app/core/models/tipo-cartao.model';
import { Observable, map, tap } from 'rxjs';

/** Banco com os campos derivados que o grid exibe. */
type BancoLinha = BancoDto & {
  nomeTipoCartaoFormatado: string;
  status: boolean;
};

@Component({
  selector: 'app-banco-list',
  templateUrl: './banco-list.component.html',
  styleUrls: ['./banco-list.component.scss'],
})
export class BancoListComponent extends CadastroListBase<BancoLinha> {
  protected readonly rotulo = { singular: 'banco', plural: 'bancos' };

  tiposCartao: TipoCartaoDto[] = [];
  tipoCartaoOpcoes: GridColumnOption[] = [];
  statusOptions = STATUS_ATIVO_OPTIONS;
  gridColumns: GridColumn[] = [];
  breadcrumb = [{ label: 'Cadastros' }, { label: 'Bancos' }];

  constructor(private tipoCartaoService: TipoCartaoService, private bancoService: BancoService) {
    super();
  }

  protected override antesDeCarregar(): Observable<unknown> {
    return this.tipoCartaoService.listar().pipe(tap(tipos => {
      this.tiposCartao = tipos;
      this.tipoCartaoOpcoes = tipos.map(tipo => ({ label: tipo.nomeTipoCartao, value: tipo.nomeTipoCartao }));
      this.setGridColumns();
    }));
  }

  protected buscar(): Observable<BancoLinha[]> {
    return this.bancoService.listar().pipe(map(bancos => bancos.map(item => ({
      ...item,
      nomeTipoCartaoFormatado: item.tipoCartao?.nomeTipoCartao ||
        this.tiposCartao.find(t => t.id === item.tipoCartaoId)?.nomeTipoCartao || '-',
      status: !!item.ativo
    }))));
  }

  protected excluirRegistro(id: number) {
    return this.bancoService.excluir(id);
  }

  protected nomeDe(banco: BancoLinha): string {
    return banco.nomeBanco;
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
