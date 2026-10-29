import { TestBed } from '@angular/core/testing';
import { Location } from '@angular/common';
import { Router, provideRouter } from '@angular/router';

import { NavegacaoService } from './navegacao.service';

/** ‹ voltar do cabeçalho (mf-page-header) nas telas do layout novo. */
describe('NavegacaoService', () => {
  let service: NavegacaoService;
  let location: Location;
  let router: Router;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideRouter([])] });
    service = TestBed.inject(NavegacaoService);
    location = TestBed.inject(Location);
    router = TestBed.inject(Router);
    spyOn(location, 'back');
    spyOn(router, 'navigate').and.resolveTo(true);
  });

  it('com tela anterior no app, volta para ela', () => {
    spyOn(service, 'temHistorico').and.returnValue(true);

    service.voltar();

    expect(location.back).toHaveBeenCalled();
    expect(router.navigate).not.toHaveBeenCalled();
  });

  it('aberta direto pelo link, vai para a Página Inicial (ou o destino pedido)', () => {
    spyOn(service, 'temHistorico').and.returnValue(false);

    service.voltar();
    service.voltar(['/planejamento']);

    expect(location.back).not.toHaveBeenCalled();
    expect(router.navigate).toHaveBeenCalledWith(['/home']);
    expect(router.navigate).toHaveBeenCalledWith(['/planejamento']);
  });

  it('o Angular marca a primeira navegação com navigationId 1', () => {
    spyOnProperty(window.history, 'state').and.returnValue({ navigationId: 1 });
    expect(service.temHistorico()).toBeFalse();
  });
});
