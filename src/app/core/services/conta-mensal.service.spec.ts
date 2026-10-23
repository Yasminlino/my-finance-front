import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';

import { ContaMensalService } from './conta-mensal.service';
import { environment } from 'src/environments/environment';

/**
 * O vencimento vai como data de calendário "YYYY-MM-DD" (DB-P1-02), no campo `data` do contrato em
 * português ([DB] P3). Como o dto é `any`, o compilador não avisa se o campo for lido com outro nome.
 */
describe('ContaMensalService: vencimento como data de calendário', () => {
  let http: HttpTestingController;
  const base = environment.apiBaseUrl.replace(/\/+$/, '');

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()]
    });
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('criar envia data como "YYYY-MM-DD"', () => {
    TestBed.inject(ContaMensalService).criar({ nome: 'Luz', valor: 120, situacao: 'PENDENTE', data: new Date(2026, 9, 5) }).subscribe();

    const req = http.expectOne(`${base}/CreateTransaction`);
    expect(req.request.body).toEqual({ nome: 'Luz', valor: 120, situacao: 'PENDENTE', data: '2026-10-05' });
    req.flush({});
  });

  it('atualizar envia data como "YYYY-MM-DD"', () => {
    TestBed.inject(ContaMensalService).atualizar({ id: 3, nome: 'Luz', valor: 120, situacao: 'PAGO', data: new Date(2026, 11, 31) }).subscribe();

    const req = http.expectOne(`${base}/UpdateTransaction`);
    expect(req.request.body).toEqual({ id: 3, nome: 'Luz', valor: 120, situacao: 'PAGO', data: '2026-12-31' });
    req.flush({});
  });
});
