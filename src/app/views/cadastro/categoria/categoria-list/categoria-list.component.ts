import { Component } from '@angular/core';
import { Category, CategoryService } from 'src/app/core/services/category.service';
import { NaturezaOperacaoLabel } from 'src/app/shared/enums/natureza-operacao.enum';
import { GridColumn, GridColumnOption } from 'src/app/shared/components/data-grid/data-grid.interface';
import { GridColumnTypeEnum } from 'src/app/shared/components/data-grid/enum/grid-column.enum';
import { STATUS_ATIVO_OPTIONS, statusAtivoLabel } from 'src/app/shared/enums/status.enum';
import { CadastroListBase } from 'src/app/shared/base/cadastro-list.base';

@Component({
  selector: 'app-categoria-list',
  templateUrl: './categoria-list.component.html',
  styleUrls: ['./categoria-list.component.scss']
})
export class CategoriaListComponent extends CadastroListBase<Category> {
  protected readonly rotulo = { singular: 'categoria', plural: 'categorias', feminino: true };

  naturezaOperacaoOptions: GridColumnOption[] = Object.entries(NaturezaOperacaoLabel).map(([value, label]) => ({
    label,
    value: Number(value)
  }));

  statusOptions = STATUS_ATIVO_OPTIONS;

  gridColumns: GridColumn[] = [
    { field: 'name', header: 'Nome', type: GridColumnTypeEnum.Text, width: "30%" },
    {
      field: 'subCategory',
      header: 'Tipo Categoria',
      type: GridColumnTypeEnum.Select,
      options: [
        { label: 'Despesa', value: 'Despesa' },
        { label: 'Receita', value: 'Receita' },
        { label: 'Investimento', value: 'Investimento' }
      ],
      width: "20%"
    },
    {
      field: 'naturezaOperacao',
      header: 'Natureza da Operação',
      type: GridColumnTypeEnum.Select,
      options: this.naturezaOperacaoOptions,
      formatter: (row) => NaturezaOperacaoLabel[row.naturezaOperacao] ?? row.naturezaOperacao,
      width: "21%"
    },
    {
      field: 'status',
      header: 'Status',
      type: GridColumnTypeEnum.Select,
      options: this.statusOptions,
      formatter: (row) => statusAtivoLabel(row.status),
      width: "20%"
    },
    { field: 'actions', header: 'Ações', type: GridColumnTypeEnum.Actions, functions: ['edit', 'delete'] },
  ];

  breadcrumb = [{ label: 'Cadastros' }, { label: 'Categorias' }];

  constructor(private categoryService: CategoryService) {
    super();
  }

  protected buscar(): Promise<Category[]> {
    return this.categoryService.list();
  }

  protected excluirRegistro(id: number) {
    return this.categoryService.delete(id);
  }

  protected nomeDe(categoria: Category): string {
    return categoria.name;
  }
}
