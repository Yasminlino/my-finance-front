import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';

import { ListaService } from './lista.service';
import { ItemListaService } from './item-lista.service';
import { environment } from 'src/environments/environment';

/**
 * CreateLista e CreateItemLista respondem 200 com texto puro ("Lista criada com sucesso!").
 * Pedidos como JSON, o HttpClient falha ao interpretar o corpo e a tela mostra erro mesmo
 * com a lista gravada; por isso o create das listas pede a resposta como texto.
 */
describe('Criação de listas e itens', () => {
  let http: HttpTestingController;
  const base = environment.apiBaseUrl.replace(/\/+$/, '');

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()]
    });
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('ListaService.criar pede a resposta como texto', () => {
    TestBed.inject(ListaService).criar({ nome: 'X' }).subscribe();

    const req = http.expectOne(`${base}/CreateLista`);
    expect(req.request.responseType).toBe('text');
    req.flush('Lista criada com sucesso!');
  });

  it('ItemListaService.criar pede a resposta como texto', () => {
    TestBed.inject(ItemListaService).criar({ descricao: 'X' }).subscribe();

    const req = http.expectOne(`${base}/CreateItemLista`);
    expect(req.request.responseType).toBe('text');
    req.flush('ItemLista criada com sucesso!');
  });
});
