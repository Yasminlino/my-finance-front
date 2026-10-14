import { EMPTY, Observable, catchError, switchMap } from 'rxjs';

/**
 * Busca de tela por período (mês, filtro): cada novo período cancela a busca anterior, então só a
 * resposta do último chega à tela, mesmo que a anterior responda depois (FE-P2-08).
 * O erro de uma busca vai para `aoFalhar` e não encerra o fluxo: o próximo período ainda carrega.
 */
export function ultimaBusca<P, T>(
  periodos$: Observable<P>,
  buscar: (periodo: P) => Observable<T>,
  aoFalhar: (erro: unknown) => void
): Observable<T> {
  return periodos$.pipe(
    switchMap(periodo => buscar(periodo).pipe(
      catchError(erro => {
        aoFalhar(erro);
        return EMPTY;
      })
    ))
  );
}
