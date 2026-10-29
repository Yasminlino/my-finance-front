import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';

import { ListaService } from './lista.service';
import { ItemListaService } from './item-lista.service';
import { environment } from 'src/environments/environment';

/** Rotas REST das listas e dos itens (card #67): itens sempre aninhados em /listas/{id}. */
describe('Rotas de listas e itens', () => {
  let http: HttpTestingController;
  const base = environment.apiBaseUrl.replace(/\/+$/, '');

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()]
    });
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('lista as listas em uso por padrão e as arquivadas quando pedido', () => {
    const service = TestBed.inject(ListaService);
    service.listar().subscribe();
    service.listar(true).subscribe();

    http.expectOne(`${base}/listas?arquivadas=false`).flush([]);
    http.expectOne(`${base}/listas?arquivadas=true`).flush([]);
  });

  it('cria, atualiza, arquiva, desarquiva, duplica e exclui a lista pelas rotas dela', () => {
    const service = TestBed.inject(ListaService);
    let criada: unknown;
    service.criar({ nome: 'X' }).subscribe(r => (criada = r));
    service.atualizar({ id: 8, nome: 'Y' }).subscribe();
    service.arquivar(8).subscribe();
    service.desarquivar(8).subscribe();
    service.duplicar(8).subscribe();
    service.excluir(8).subscribe();

    const post = http.expectOne(r => r.method === 'POST' && r.url === `${base}/listas`);
    expect(post.request.responseType).toBe('json');
    post.flush({ id: 8, nome: 'X' }, { status: 201, statusText: 'Created' });
    expect(criada).toEqual({ id: 8, nome: 'X' });
    expect(http.expectOne(r => r.method === 'PUT' && r.url === `${base}/listas/8`).request.body).toEqual({ id: 8, nome: 'Y' });
    http.expectOne(r => r.method === 'POST' && r.url === `${base}/listas/8/arquivar`).flush(null);
    http.expectOne(r => r.method === 'POST' && r.url === `${base}/listas/8/desarquivar`).flush(null);
    expect(http.expectOne(`${base}/listas/8/duplicar`).request.body).toEqual({});
    http.expectOne(r => r.method === 'DELETE' && r.url === `${base}/listas/8`).flush(null);
  });

  it('série e comparação: opções do duplicar, ligar/sair da série e comparar com base', () => {
    const service = TestBed.inject(ListaService);
    service.duplicar(8, { nome: 'Compras · nov/2026', arquivarOriginal: true }).subscribe();
    service.serie(8).subscribe();
    service.definirSerie(8, 5).subscribe();
    service.definirSerie(8, null).subscribe();
    service.comparar(8).subscribe();
    service.comparar(8, 5, 'ok').subscribe();

    expect(http.expectOne(`${base}/listas/8/duplicar`).request.body).toEqual({ nome: 'Compras · nov/2026', arquivarOriginal: true });
    http.expectOne(r => r.method === 'GET' && r.url === `${base}/listas/8/serie`).flush([]);
    const [ligar, sair] = http.match(r => r.method === 'PUT' && r.url === `${base}/listas/8/serie`);
    expect(ligar.request.body).toEqual({ comListaId: 5 });
    expect(sair.request.body).toEqual({ comListaId: null });
    http.expectOne(`${base}/listas/8/comparar?base=estimado`).flush({});
    http.expectOne(`${base}/listas/8/comparar?com=5&base=ok`).flush({});
  });

  it('agenda: período, só esta, esta e as próximas e encerrar', () => {
    const service = TestBed.inject(ItemListaService);
    service.listarPeriodo(11, '2026-10-26', '2026-11-01').subscribe();
    service.alterarOcorrencia(11, 5, '2026-10-28', { feito: true }).subscribe();
    service.dividir(11, 5, '2026-11-02', { descricao: 'Academia', hora: '18:00:00' }).subscribe();
    service.encerrar(11, 5, '2026-11-09').subscribe();

    http.expectOne(`${base}/listas/11/itens?de=2026-10-26&ate=2026-11-01`).flush([]);
    const so = http.expectOne(r => r.method === 'PUT' && r.url === `${base}/listas/11/itens/5/ocorrencias/2026-10-28`);
    expect(so.request.body).toEqual({ feito: true });
    expect(http.expectOne(`${base}/listas/11/itens/5/dividir`).request.body)
      .toEqual({ aPartirDe: '2026-11-02', item: { descricao: 'Academia', hora: '18:00:00' } });
    http.expectOne(r => r.method === 'DELETE' && r.urlWithParams === `${base}/listas/11/itens/5/ocorrencias?aPartirDe=2026-11-09`).flush(null);
  });

  it('itens usam a lista da rota, e o lote vai numa requisição só', () => {
    const service = TestBed.inject(ItemListaService);
    service.listarDaLista(8).subscribe();
    service.criar(8, { descricao: 'Arroz' }).subscribe();
    service.atualizar(8, { id: 30, descricao: 'Arroz', feito: true }).subscribe();
    service.excluir(8, 30).subscribe();
    service.marcarFeito(8, [30, 31]).subscribe();
    service.desmarcarTodos(8).subscribe();
    service.excluirConcluidos(8).subscribe();

    http.expectOne(r => r.method === 'GET' && r.url === `${base}/listas/8/itens`).flush([]);
    http.expectOne(r => r.method === 'POST' && r.url === `${base}/listas/8/itens`).flush({ id: 30 }, { status: 201, statusText: 'Created' });
    http.expectOne(r => r.method === 'PUT' && r.url === `${base}/listas/8/itens/30`).flush({});
    http.expectOne(r => r.method === 'DELETE' && r.url === `${base}/listas/8/itens/30`).flush(null);
    expect(http.expectOne(r => r.method === 'PATCH' && r.url === `${base}/listas/8/itens/feito`).request.body)
      .toEqual({ ids: [30, 31], feito: true });
    http.expectOne(`${base}/listas/8/itens/desmarcar-todos`).flush({ afetados: 1 });
    http.expectOne(r => r.method === 'DELETE' && r.url === `${base}/listas/8/itens/concluidos`).flush({ afetados: 1 });
  });
});
