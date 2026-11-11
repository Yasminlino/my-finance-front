import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { AvisoDto } from '../models/notificacao.model';
import { ApiService } from './api.service';
import { NotificacoesService } from './notificacoes.service';

/** Card #73: o sino guarda a última lista; "Marcar tudo como lido" zera já e volta se a API recusar. */
describe('NotificacoesService', () => {
  let api: jasmine.SpyObj<ApiService>;
  let service: NotificacoesService;
  const avisos: AvisoDto[] = [
    { id: 'a', tipo: 'vencidas', desde: '2026-11-11T03:00:00Z', novo: true, titulo: 'A' },
    { id: 'b', tipo: 'agenda', desde: '2026-11-10T03:00:00Z', novo: false, titulo: 'B' }
  ];

  beforeEach(() => {
    api = jasmine.createSpyObj<ApiService>('ApiService', ['get', 'post', 'put']);
    TestBed.configureTestingModule({ providers: [{ provide: ApiService, useValue: api }] });
    service = TestBed.inject(NotificacoesService);
  });

  it('atualizar guarda os avisos e conta os novos', () => {
    api.get.and.returnValue(of({ avisos, novos: 1 }));

    service.atualizar();

    expect(api.get).toHaveBeenCalledWith('/notificacoes');
    expect(service.avisos().length).toBe(2);
    expect(service.novos()).toBe(1);
    expect(service.erro()).toBeFalse();
  });

  it('erro marca o estado sem apagar o que já tinha', () => {
    api.get.and.returnValue(of({ avisos, novos: 1 }));
    service.atualizar();
    api.get.and.returnValue(throwError(() => new Error('x')));

    service.atualizar();

    expect(service.erro()).toBeTrue();
    expect(service.avisos().length).toBe(2);
  });

  it('marcar tudo como lido zera o contador e volta se a API recusar', () => {
    api.get.and.returnValue(of({ avisos, novos: 1 }));
    service.atualizar();

    api.post.and.returnValue(of(null));
    service.marcarTudoComoLido().subscribe();
    expect(api.post).toHaveBeenCalledWith('/notificacoes/lidas', null);
    expect(service.novos()).toBe(0);

    service.atualizar();
    api.post.and.returnValue(throwError(() => new Error('x')));
    service.marcarTudoComoLido().subscribe({ error: () => undefined });
    expect(service.novos()).toBe(1);
  });
});
