import { Injectable, computed, inject, signal } from '@angular/core';
import { Observable, map, tap } from 'rxjs';
import { AvisoDto, NotificacoesDto, PreferenciasNotificacaoDto } from '../models/notificacao.model';
import { ApiService } from './api.service';

/**
 * Avisos do sino (card #73). A API calcula; aqui fica a última lista (signal) para o sino e o painel.
 * O cabeçalho pede de novo a cada troca de tela e depois de pagar uma conta, como o selo das vencidas.
 */
@Injectable({ providedIn: 'root' })
export class NotificacoesService {
  private readonly api = inject(ApiService);
  private readonly _avisos = signal<AvisoDto[]>([]);
  private readonly _erro = signal(false);
  private readonly _carregou = signal(false);
  private readonly _pausadoAte = signal<string | null>(null);

  readonly avisos = this._avisos.asReadonly();
  readonly erro = this._erro.asReadonly();
  /** Já respondeu ao menos uma vez (some o skeleton do painel). */
  readonly carregou = this._carregou.asReadonly();
  /** "Pausar tudo" em vigor (yyyy-mm-dd) ou null. */
  readonly pausadoAte = this._pausadoAte.asReadonly();
  readonly novos = computed(() => this._avisos().filter(a => a.novo).length);

  atualizar(): void {
    this.api.get<NotificacoesDto>('/notificacoes').subscribe({
      next: r => {
        this._avisos.set(Array.isArray(r?.avisos) ? r.avisos : []);
        this._pausadoAte.set(r?.pausadoAte ?? null);
        this._erro.set(false);
        this._carregou.set(true);
      },
      error: () => {
        this._erro.set(true);
        this._carregou.set(true);
      }
    });
  }

  /** Zera o contador já na tela; se a API recusar, volta como estava. */
  marcarTudoComoLido(): Observable<unknown> {
    const antes = this._avisos();
    this._avisos.set(antes.map(a => ({ ...a, novo: false })));
    return this.api.post('/notificacoes/lidas', null).pipe(
      tap({ error: () => this._avisos.set(antes) })
    );
  }

  preferencias(): Observable<PreferenciasNotificacaoDto> {
    return this.api.get<PreferenciasNotificacaoDto>('/preferencias/notificacoes');
  }

  salvarPreferencias(dto: PreferenciasNotificacaoDto): Observable<PreferenciasNotificacaoDto> {
    return this.api.put<PreferenciasNotificacaoDto>('/preferencias/notificacoes', dto).pipe(
      map(r => r ?? dto),
      tap(() => this.atualizar())
    );
  }
}
