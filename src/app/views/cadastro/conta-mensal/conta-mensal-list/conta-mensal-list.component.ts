import { Component } from '@angular/core';
import { ContaService } from 'src/app/core/services/contas.service';
import { CategoryService } from 'src/app/core/services/category.service';
import { formatCurrencyBR } from 'src/app/core/utils/mask';
import { GridColumn, GridColumnOption } from 'src/app/shared/components/data-grid/data-grid.interface';
import { STATUS_ATIVO_OPTIONS, statusAtivoLabel } from 'src/app/shared/enums/status.enum';
import { GridColumnTypeEnum } from 'src/app/shared/components/data-grid/enum/grid-column.enum';
import { CadastroListBase } from 'src/app/shared/base/cadastro-list.base';
import { CategoriaDto } from 'src/app/core/models/categoria.model';
import { ContaDto, ContaVencimentoDto } from 'src/app/core/models/conta.model';
import { Observable, map, tap } from 'rxjs';

/** Conta com os campos derivados que o grid exibe. */
type ContaLinha = ContaDto & {
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

  categorias: CategoriaDto[] = [];
  categoriasOptions: GridColumnOption[] = [];
  statusOptions = STATUS_ATIVO_OPTIONS;
  gridColumns: GridColumn<ContaLinha>[] = [];
  breadcrumb = [{ label: 'Cadastros' }, { label: 'Contas' }];

  constructor(private categoryService: CategoryService, private contaService: ContaService) {
    super();
  }

  protected override antesDeCarregar(): Observable<unknown> {
    return this.categoryService.listarAtivas().pipe(tap(categorias => {
      this.categorias = categorias;
      this.categoriasOptions = categorias.map(categoria => ({ label: categoria.nome, value: categoria.nome }));
      this.setGridColumns();
    }));
  }

  protected buscar(): Observable<ContaLinha[]> {
    return this.contaService.listar().pipe(map(contas => contas.map(item => ({
      ...item,
      diasVencimentoSort: item.vencimentos && item.vencimentos.length > 0
        ? Number(item.vencimentos[0].dia)
        : 0,
      diasVencimentoString: this.getDatas(item.vencimentos)
    }))));
  }

  protected excluirRegistro(id: number) {
    return this.contaService.excluir(id);
  }

  protected nomeDe(conta: ContaLinha): string {
    return conta.nome;
  }

  private setGridColumns(): void {
    this.gridColumns = [
      { field: 'nome', header: 'NOME', type: GridColumnTypeEnum.Text, width: "25%" },
      {
        field: "valor",
        header: "VALOR",
        type: GridColumnTypeEnum.Money,
        formatter: (row) => formatCurrencyBR(row.valor),
        width: '12%',
        editable: true
      },
      {
        field: 'diasVencimentoSort',
        header: 'DIA VENCIMENTO',
        type: GridColumnTypeEnum.Number,
        formatter: (row) => this.getDatas(row.vencimentos),
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
        field: "categoriaNome",
        header: "CATEGORIA",
        type: GridColumnTypeEnum.Select,
        options: this.categoriasOptions,
        width: '18%',
        editable: false
      },
      {
        field: 'ativo',
        header: 'STATUS',
        type: GridColumnTypeEnum.Select,
        options: this.statusOptions,
        formatter: (row) => statusAtivoLabel(row.ativo),
        width: "10%"
      },
      { field: 'actions', header: 'AÇÕES', type: GridColumnTypeEnum.Actions, functions: ['edit', 'delete'] },
    ];
  }

  formataParcela(conta: ContaDto): string {
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
