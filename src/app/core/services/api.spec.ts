import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';

import { ApiService } from './api.service';
import { environment } from 'src/environments/environment';

/** FE-P2-08: ApiService devolve Observable (padrão do Angular) e monta query params. */
describe('ApiService', () => {
  let service: ApiService;
  let http: HttpTestingController;
  const base = environment.apiBaseUrl.replace(/\/+$/, '');

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()]
    });
    service = TestBed.inject(ApiService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('não faz a requisição antes do subscribe (Observable frio)', () => {
    service.get('/GetBancos');
    http.expectNone(`${base}/GetBancos`);
  });

  it('get com id vai na rota', () => {
    let resposta: unknown;
    service.get<{ id: number }>('/GetBancoById', 18).subscribe(r => (resposta = r));

    http.expectOne(`${base}/GetBancoById/18`).flush({ id: 18 });
    expect(resposta).toEqual({ id: 18 });
  });

  it('get monta os query params e ignora nulos', () => {
    service.get('/GetExtratoBancarioItensByMonth', undefined, {
      params: { month: '2026-10', bancoId: null, ehCredito: false, extra: undefined }
    }).subscribe();

    const req = http.expectOne(r => r.url === `${base}/GetExtratoBancarioItensByMonth`);
    expect(req.request.params.get('month')).toBe('2026-10');
    expect(req.request.params.get('ehCredito')).toBe('false');
    expect(req.request.params.has('bancoId')).toBeFalse();
    expect(req.request.params.has('extra')).toBeFalse();
    req.flush([]);
  });

  it('post, put e delete usam o verbo e o corpo certos', () => {
    service.post('/CreateBanco', { nomeBanco: 'X' }).subscribe();
    service.put('/UpdateBanco', { id: 1 }).subscribe();
    service.delete('/DeleteBanco', 1).subscribe();

    const post = http.expectOne(`${base}/CreateBanco`);
    expect(post.request.method).toBe('POST');
    expect(post.request.body).toEqual({ nomeBanco: 'X' });
    expect(http.expectOne(`${base}/UpdateBanco`).request.method).toBe('PUT');
    expect(http.expectOne(`${base}/DeleteBanco/1`).request.method).toBe('DELETE');
    http.match(() => true).forEach(r => r.flush({}));
  });

  it('post de cadastro recebe o criado como JSON (201, BE-P3-05)', () => {
    let resposta: unknown;
    service.post('/CreateLista', { nome: 'X' }).subscribe(r => (resposta = r));

    const req = http.expectOne(`${base}/CreateLista`);
    expect(req.request.responseType).toBe('json');
    req.flush({ id: 8, nome: 'X' }, { status: 201, statusText: 'Created' });
    expect(resposta).toEqual({ id: 8, nome: 'X' });
  });

  it('delete com 204 conclui sem corpo (BE-P3-05)', () => {
    let concluiu = false;
    service.delete('/DeleteLista', 8).subscribe({ complete: () => (concluiu = true) });

    http.expectOne(`${base}/DeleteLista/8`).flush(null, { status: 204, statusText: 'No Content' });
    expect(concluiu).toBeTrue();
  });
});
