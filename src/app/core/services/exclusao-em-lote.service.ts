import { Injectable } from '@angular/core';
import { AlertService } from 'src/app/shared/components/alert.service';
import { extrairMensagemErro } from '../utils/http-error';

/** Nome da entidade excluída, para montar a mensagem com concordância correta. */
export interface RotuloEntidade {
  /** Ex.: 'banco' */
  singular: string;
  /** Ex.: 'bancos' */
  plural: string;
  /** Define "excluída(s)" em vez de "excluído(s)". */
  feminino?: boolean;
}

export interface ResultadoExclusaoEmLote {
  total: number;
  excluidos: number;
  falhas: number;
}

/**
 * Exclusão item a item com contagem real de sucessos e falhas.
 *
 * O bloco que isto substitui guardava só o retorno do último item
 * (`var response; for (...) { response = await ... }`), então:
 *  - endpoint que devolve 204/vazio não emitia mensagem nenhuma apesar do sucesso;
 *  - falha no meio do lote abortava o resto e avisava que *todos* falharam.
 *
 * Ver FE-P0-08. A extração da base de CRUD (FE-P1-01) deve absorver este serviço.
 */
@Injectable({ providedIn: 'root' })
export class ExclusaoEmLoteService {
  constructor(private readonly alertService: AlertService) {}

  /**
   * Tenta excluir todas as linhas, sem abortar no primeiro erro, e informa o
   * resultado efetivo via AlertService. Não lança: o resultado volta no retorno.
   */
  async excluir<T>(
    rows: T[],
    excluirItem: (row: T) => Promise<unknown>,
    rotulo: RotuloEntidade
  ): Promise<ResultadoExclusaoEmLote> {
    const resultado: ResultadoExclusaoEmLote = {
      total: rows.length,
      excluidos: 0,
      falhas: 0
    };

    let primeiroErro: unknown = null;

    for (const row of rows) {
      try {
        await excluirItem(row);
        resultado.excluidos++;
      } catch (e) {
        resultado.falhas++;
        if (primeiroErro === null) {
          primeiroErro = e;
        }
      }
    }

    this.informar(resultado, rotulo, primeiroErro);

    return resultado;
  }

  private informar(
    resultado: ResultadoExclusaoEmLote,
    rotulo: RotuloEntidade,
    primeiroErro: unknown
  ): void {
    const { total, excluidos, falhas } = resultado;

    if (total === 0) {
      return;
    }

    if (falhas === 0) {
      this.alertService.success(
        `${excluidos} ${this.substantivo(excluidos, rotulo)} ${this.participio(excluidos, rotulo)} com sucesso!`
      );
      return;
    }

    const detalhe = extrairMensagemErro(primeiroErro, 'verifique se há vínculos com outros registros.');

    if (excluidos === 0) {
      this.alertService.error(
        `Nenhum item foi excluído (${total} ${this.substantivo(total, rotulo)}): ${detalhe}`
      );
      return;
    }

    this.alertService.contrast(
      'Exclusão parcial',
      `${excluidos} de ${total} ${this.substantivo(total, rotulo)} ${this.participio(excluidos, rotulo)}. ` +
      `${falhas} falhou(aram): ${detalhe}`
    );
  }

  private substantivo(quantidade: number, rotulo: RotuloEntidade): string {
    return quantidade === 1 ? rotulo.singular : rotulo.plural;
  }

  private participio(quantidade: number, rotulo: RotuloEntidade): string {
    if (rotulo.feminino) {
      return quantidade === 1 ? 'excluída' : 'excluídas';
    }

    return quantidade === 1 ? 'excluído' : 'excluídos';
  }
}
