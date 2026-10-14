import { Component } from '@angular/core';
import { GridColumn } from 'src/app/shared/components/data-grid/data-grid.interface';
import { GridColumnTypeEnum } from 'src/app/shared/components/data-grid/enum/grid-column.enum';
import { TipoMovimentacaoDto } from 'src/app/core/models/tipo-movimentacao.model';
import { TipoMovimentacaoService } from 'src/app/core/services/tipo-movimentacao.service';
import { CadastroListBase } from 'src/app/shared/base/cadastro-list.base';
import { Observable } from 'rxjs';

@Component({
  selector: 'app-tipo-movimentacao-list',
  templateUrl: './tipo-movimentacao-list.component.html',
  styleUrls: ['./tipo-movimentacao-list.component.scss'],
})
export class TipoMovimentacaoListComponent extends CadastroListBase<TipoMovimentacaoDto> {
  protected readonly rotulo = { singular: 'tipo de movimentação', plural: 'tipos de movimentação' };

  gridColumns: GridColumn[] = [
    { field: 'nomeTipoMovimentacao', header: 'NOME TIPO MOVIMENTAÇÃO', type: GridColumnTypeEnum.Text, width: "40%" },
    { field: 'descricao', header: 'DESCRIÇÃO', type: GridColumnTypeEnum.Text, width: "50%" },
    { field: 'actions', header: 'AÇÕES', type: GridColumnTypeEnum.Actions, functions: ['edit', 'delete'] },
  ];
  breadcrumb = [{ label: 'Cadastros' }, { label: 'Tipo movimentação' }];

  constructor(private tipoMovimentacaoService: TipoMovimentacaoService) {
    super();
  }

  protected buscar(): Observable<TipoMovimentacaoDto[]> {
    return this.tipoMovimentacaoService.listar();
  }

  protected excluirRegistro(id: number) {
    return this.tipoMovimentacaoService.excluir(id);
  }

  protected nomeDe(tipo: TipoMovimentacaoDto): string {
    return tipo.nomeTipoMovimentacao;
  }
}
