import { DestroyRef, Injectable, Signal, inject, signal } from '@angular/core';

/** Abaixo disto a tela usa o layout de celular (o "md" do PrimeFlex começa em 768px). */
const CONSULTA_MOVEL = '(max-width: 767.98px)';

/**
 * Largura de celular, para as telas que trocam de layout (ex.: Contas a Pagar vira lista de cards).
 * matchMedia em vez de @angular/cdk, que o projeto não tem.
 */
@Injectable({ providedIn: 'root' })
export class LarguraTelaService {
  private readonly _movel = signal(false);
  readonly movel: Signal<boolean> = this._movel.asReadonly();

  constructor() {
    const consulta = window.matchMedia(CONSULTA_MOVEL);
    this._movel.set(consulta.matches);

    const aoMudar = (e: { matches: boolean }) => this._movel.set(e.matches);
    consulta.addEventListener('change', aoMudar);
    inject(DestroyRef).onDestroy(() => consulta.removeEventListener('change', aoMudar));
  }
}
