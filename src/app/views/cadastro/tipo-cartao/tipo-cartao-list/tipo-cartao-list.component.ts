import { Component } from '@angular/core';
import { GridColumn } from 'src/app/shared/components/data-grid/data-grid.interface';
import { GridColumnTypeEnum } from 'src/app/shared/components/data-grid/enum/grid-column.enum';
import { TipoCartaoDto, TipoCartaoService } from 'src/app/core/services/tipo-cartao.service';
import { CadastroListBase } from 'src/app/shared/base/cadastro-list.base';

/** Tipos do sistema vêm somente leitura: o grid esconde editar/excluir e a seleção. */
type TipoCartaoLinha = TipoCartaoDto & { somenteLeitura: boolean };

@Component({
  selector: 'app-tipo-cartao-list',
  templateUrl: './tipo-cartao-list.component.html',
  styleUrls: ['./tipo-cartao-list.component.scss'],
})
export class TipoCartaoListComponent extends CadastroListBase<TipoCartaoLinha> {
  protected readonly rotulo = { singular: 'tipo de cartão', plural: 'tipos de cartão' };

  gridColumns: GridColumn[] = [
    { field: 'nomeTipoCartao', header: 'NOME TIPO CARTÃO', type: GridColumnTypeEnum.Text, width: "50%" },
    { field: 'ehSistema', header: 'PADRÃO DO SISTEMA', type: GridColumnTypeEnum.Text, formatter: (row) => row.ehSistema ? 'Sim' : 'Não', width: "20%" },
    { field: 'ehCredito', header: 'CARTÃO DE CRÉDITO', type: GridColumnTypeEnum.Text, formatter: (row) => row.ehCredito ? 'Sim' : 'Não', width: "20%" },
    { field: 'actions', header: 'AÇÕES', type: GridColumnTypeEnum.Actions, functions: ['edit', 'delete'] },
  ];
  breadcrumb = [{ label: 'Cadastros' }, { label: 'Tipo Cartão' }];

  constructor(private tipoCartaoService: TipoCartaoService) {
    super();
  }

  protected async buscar(): Promise<TipoCartaoLinha[]> {
    const tipos = await this.tipoCartaoService.list();
    return tipos.map(t => ({ ...t, somenteLeitura: t.ehSistema }));
  }

  protected excluirRegistro(id: number) {
    return this.tipoCartaoService.delete(id);
  }

  protected nomeDe(tipo: TipoCartaoLinha): string {
    return tipo.nomeTipoCartao;
  }
}
