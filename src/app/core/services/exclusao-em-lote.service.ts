import { Injectable } from '@angular/core';
import { Observable, catchError, concatMap, defaultIfEmpty, defer, finalize, from, last, map, of, tap, toArray } from 'rxjs';
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
 * O que o serviço precisa do data-grid: avisar que a exclusão terminou. O grid libera o botão e,
 * se excluiu, limpa a seleção. Antes o serviço escrevia `grid.deleting` por fora (FE-P2-05).
 */
export interface GridSelecionavel {
  concluirExclusao(excluiu: boolean): void;
}

/**
 * Exclusão item a item com contagem real de sucessos e falhas.
 *
 * O bloco que isto substitui guardava só o retorno do último item
 * (`var response; for (...) { response = await ... }`), então:
 *  - endpoint que devolve 204/vazio não emitia mensagem nenhuma apesar do sucesso;
 *  - falha no meio do lote abortava o resto e avisava que *todos* falharam.
 *
 * Ver FE-P0-08 e FE-P1-01.
 */
@Injectable({ providedIn: 'root' })
export class ExclusaoEmLoteService {
  constructor(private readonly alertService: AlertService) {}

  /**
   * Fluxo completo do (deleteSelected) do data-grid: confirma, exclui e sempre avisa o grid
   * que terminou (ele libera o botão e, se excluiu, limpa a seleção). Emite true quando a
   * exclusão rodou — aí quem chama recarrega a tela. Nada acontece antes do subscribe.
   */
  confirmarEExcluir<T>(
    grid: GridSelecionavel | undefined,
    rows: T[],
    excluirItem: (row: T) => Observable<unknown>,
    rotulo: RotuloEntidade
  ): Observable<boolean> {
    return defer(() => {
      let excluiu = false;
      const concluir = finalize<boolean>(() => grid?.concluirExclusao(excluiu));

      if (!rows.length) {
        return of(false).pipe(concluir);
      }

      const selecionado = this.concordar(rows.length, rotulo, 'selecionado', 'selecionada');
      if (!window.confirm(`Excluir ${rows.length} ${this.substantivo(rows.length, rotulo)} ${selecionado}?`)) {
        return of(false).pipe(concluir);
      }

      return this.excluir(rows, excluirItem, rotulo).pipe(
        tap(() => (excluiu = true)),
        map(() => true),
        concluir
      );
    });
  }

  /**
   * Exclui as linhas uma por vez, sem abortar no primeiro erro, e informa o resultado
   * efetivo via AlertService. Não falha: o resultado volta na emissão.
   */
  excluir<T>(
    rows: T[],
    excluirItem: (row: T) => Observable<unknown>,
    rotulo: RotuloEntidade
  ): Observable<ResultadoExclusaoEmLote> {
    return from(rows).pipe(
      concatMap(row => excluirItem(row).pipe(
        // 204 do HttpClient emite null; um Observable que só completa também conta como sucesso.
        defaultIfEmpty(null),
        last(),
        map(() => ({ ok: true as const })),
        catchError(erro => of({ ok: false as const, erro }))
      )),
      toArray(),
      map(tentativas => {
        const falhas = tentativas.filter(t => !t.ok);
        const resultado: ResultadoExclusaoEmLote = {
          total: rows.length,
          excluidos: tentativas.length - falhas.length,
          falhas: falhas.length
        };
        const primeiroErro = falhas.length ? (falhas[0] as { erro: unknown }).erro : null;
        this.informar(resultado, rotulo, primeiroErro);
        return resultado;
      })
    );
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
    return this.concordar(quantidade, rotulo, 'excluído', 'excluída');
  }

  /** Flexiona um particípio regular ("excluído") em gênero e número. */
  private concordar(quantidade: number, rotulo: RotuloEntidade, masculino: string, feminino: string): string {
    const base = rotulo.feminino ? feminino : masculino;
    return quantidade === 1 ? base : `${base}s`;
  }
}
