import { Component } from '@angular/core';
import { AccountDto, ContaService, ContaVencimentoDto } from 'src/app/core/services/contas.service';
import { Category, CategoryService } from 'src/app/core/services/category.service';
import { formatCurrencyBR } from 'src/app/core/utils/mask';
import { GridColumn, GridColumnOption } from 'src/app/shared/components/data-grid/data-grid.interface';
import { STATUS_ATIVO_OPTIONS, statusAtivoLabel } from 'src/app/shared/enums/status.enum';
import { GridColumnTypeEnum } from 'src/app/shared/components/data-grid/enum/grid-column.enum';
import { CadastroListBase } from 'src/app/shared/base/cadastro-list.base';

/** Conta com os campos derivados que o grid exibe. */
type ContaLinha = AccountDto & {
  /** Primeiro dia de vencimento como número, para ordenar a coluna (0 se não houver). */
  diasVencimentoSort: number;
  diasVencimentoString: string;
};

@Component({
  selector: 'app-conta-mensal-list',
  templateUrl: './conta-mensal-list.component.html',
  styleUrls: ['./conta-mensal-list.component.scss']
})
export class ContaMensalListComponent extends CadastroListBase<ContaLinha> {
  protected readonly rotulo = { singular: 'conta', plural: 'contas', feminino: true };

  categorias: Category[] = [];
  categoriasOptions: GridColumnOption[] = [];
  statusOptions = STATUS_ATIVO_OPTIONS;
  gridColumns: GridColumn[] = [];
  breadcrumb = [{ label: 'Cadastros' }, { label: 'Contas' }];

  constructor(private categoryService: CategoryService, private contaService: ContaService) {
    super();
  }

  protected override async antesDeCarregar(): Promise<void> {
    await this.getCategory();
    this.setGridColumns();
  }

  protected async buscar(): Promise<ContaLinha[]> {
    const response = await this.contaService.list();

    return response.map(item => ({
      ...item,
      diasVencimentoSort: item.contaVencimentos && item.contaVencimentos.length > 0
        ? Number(item.contaVencimentos[0].dia)
        : 0,
      diasVencimentoString: this.getDatas(item.contaVencimentos)
    }));
  }

  protected excluirRegistro(id: number) {
    return this.contaService.delete(id);
  }

  protected nomeDe(conta: ContaLinha): string {
    return conta.name;
  }

  private async getCategory(): Promise<void> {
    const res = await this.categoryService.buscarCategoriasAtivas();

    this.categorias = res;

    this.categoriasOptions = res.map(element => ({
      label: element.name,
      value: element.name
    }));
  }

  private setGridColumns(): void {
    this.gridColumns = [
      { field: 'name', header: 'NOME', type: GridColumnTypeEnum.Text, width: "25%" },
      {
        field: "value",
        header: "VALOR",
        type: GridColumnTypeEnum.Money,
        formatter: (row) => formatCurrencyBR(row.value),
        width: '12%',
        editable: true
      },
      {
        field: 'diasVencimentoSort',
        header: 'DIA VENCIMENTO',
        type: GridColumnTypeEnum.Number,
        formatter: (row) => this.getDatas(row.contaVencimentos),
        width: "15%"
      },
      {
        field: 'parcelaAtual',
        header: 'PARCELA',
        type: GridColumnTypeEnum.Number,
        formatter: (row) => this.formataParcela(row),
        width: "10%"
      },
      {
        field: "categoryName",
        header: "CATEGORIA",
        type: GridColumnTypeEnum.Select,
        options: this.categoriasOptions,
        width: '18%',
        editable: false
      },
      {
        field: 'status',
        header: 'STATUS',
        type: GridColumnTypeEnum.Select,
        options: this.statusOptions,
        formatter: (row) => statusAtivoLabel(row.status),
        width: "10%"
      },
      { field: 'actions', header: 'AÇÕES', type: GridColumnTypeEnum.Actions, functions: ['edit', 'delete'] },
    ];
  }

  formataParcela(conta: AccountDto): string {
    if (!conta.ehParcelado) {
      return "-";
    }

    return conta.parcelaAtual + "/" + conta.quantidadeParcelas;
  }

  getDatas(conta: ContaVencimentoDto[] | undefined): string {
    if (!conta || conta.length === 0) {
      return '-';
    }

    return conta.map(datas => datas.dia).join(', ');
  }
}
