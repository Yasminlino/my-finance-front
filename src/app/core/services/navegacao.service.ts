import { Injectable, inject } from '@angular/core';
import { Location } from '@angular/common';
import { Router } from '@angular/router';

/**
 * ‹ voltar do cabeçalho (mf-page-header [mostrarVoltar]) nas telas do layout novo: volta para a tela anterior
 * do app; se a tela foi aberta direto pelo link (sem anterior), vai para `semHistorico` (a Página Inicial).
 */
@Injectable({ providedIn: 'root' })
export class NavegacaoService {
  private readonly location = inject(Location);
  private readonly router = inject(Router);

  voltar(semHistorico: string[] = ['/home']) {
    if (this.temHistorico()) this.location.back();
    else this.router.navigate(semHistorico);
  }

  /** Há tela anterior no app: o Angular guarda o navigationId no history.state (1 = a primeira). */
  temHistorico(): boolean {
    return (window.history.state?.navigationId ?? 1) > 1;
  }
}
