import { Component } from '@angular/core';
import { GridColumn } from 'src/app/shared/components/data-grid/data-grid.interface';
import { GridColumnTypeEnum } from 'src/app/shared/components/data-grid/enum/grid-column.enum';
import { TipoCartaoDto, TipoCartaoService } from 'src/app/core/services/tipo-cartao.service';
import { CadastroListBase } from 'src/app/shared/base/cadastro-list.base';

@Component({
  selector: 'app-tipo-cartao-list',
  templateUrl: './tipo-cartao-list.component.html',
  styleUrls: ['./tipo-cartao-list.component.scss'],
})
export class TipoCartaoListComponent extends CadastroListBase<TipoCartaoDto> {
  protected readonly rotulo = { singular: 'tipo de cartão', plural: 'tipos de cartão' };

  gridColumns: GridColumn[] = [
    { field: 'nomeTipoCartao', header: 'NOME TIPO CARTÃO', type: GridColumnTypeEnum.Text, width: "90%" },
    { field: 'actions', header: 'AÇÕES', type: GridColumnTypeEnum.Actions, functions: ['edit', 'delete'] },
  ];
  breadcrumb = [{ label: 'Cadastros' }, { label: 'Tipo Cartão' }];

  constructor(private tipoCartaoService: TipoCartaoService) {
    super();
  }

  protected async buscar(): Promise<TipoCartaoDto[]> {
    return this.tipoCartaoService.list();
  }

  protected excluirRegistro(id: number) {
    return this.tipoCartaoService.delete(id);
  }

  protected nomeDe(tipo: TipoCartaoDto): string {
    return tipo.nomeTipoCartao;
  }
}
