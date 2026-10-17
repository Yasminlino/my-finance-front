import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';

import { ListaService } from './lista.service';
import { ItemListaService } from './item-lista.service';
import { environment } from 'src/environments/environment';

/**
 * CreateLista e CreateItemLista respondem 201 com o criado em JSON, como os demais cadastros
 * (BE-P3-05). Antes respondiam 200 com texto puro e o create das listas pedia a resposta como texto.
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

  it('ListaService.criar recebe a lista criada como JSON', () => {
    let criada: unknown;
    TestBed.inject(ListaService).criar({ nome: 'X' }).subscribe(r => (criada = r));

    const req = http.expectOne(`${base}/CreateLista`);
    expect(req.request.responseType).toBe('json');
    req.flush({ id: 8, nome: 'X' }, { status: 201, statusText: 'Created' });
    expect(criada).toEqual({ id: 8, nome: 'X' });
  });

  it('ItemListaService.criar recebe o item criado como JSON', () => {
    let criado: unknown;
    TestBed.inject(ItemListaService).criar({ descricao: 'X' }).subscribe(r => (criado = r));

    const req = http.expectOne(`${base}/CreateItemLista`);
    expect(req.request.responseType).toBe('json');
    req.flush({ id: 30, listaId: 8, descricao: 'X' }, { status: 201, statusText: 'Created' });
    expect(criado).toEqual({ id: 30, listaId: 8, descricao: 'X' });
  });
});
