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

  it('postTexto pede a resposta como texto e devolve a mensagem da API', () => {
    let resposta: string | undefined;
    service.postTexto('/CreateLista', { nome: 'X' }).subscribe(r => (resposta = r));

    const req = http.expectOne(`${base}/CreateLista`);
    expect(req.request.method).toBe('POST');
    expect(req.request.responseType).toBe('text');
    req.flush('Lista criada com sucesso!');
    expect(resposta).toBe('Lista criada com sucesso!');
  });
});
