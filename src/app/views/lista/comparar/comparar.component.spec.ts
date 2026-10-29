import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { ActivatedRoute, Router, convertToParamMap, provideRouter } from '@angular/router';
import { BehaviorSubject, of, throwError } from 'rxjs';

import { CompararComponent } from './comparar.component';
import { ListaService } from 'src/app/core/services/lista.service';
import { ConfirmacaoService } from 'src/app/core/services/confirmacao.service';
import { LarguraTelaService } from 'src/app/core/services/largura-tela.service';
import { AlertService } from 'src/app/shared/components/alert.service';
import { ComparacaoListasDto, ListaDto } from 'src/app/core/models/lista.model';

function lista(ajuste: Partial<ListaDto>): ListaDto {
  return {
    id: 2, nome: 'Compras · nov/2026', usaQuantidade: true, usaValor: true, modoValor: 'UNITARIO', usaLimite: false,
    usaData: false, usaObservacao: false, modelo: 'COMPRAS', ...ajuste
  };
}

const comparacao: ComparacaoListasDto = {
  anterior: { id: 1, nome: 'Compras · out/2026', total: 58 },
  atual: { id: 2, nome: 'Compras · nov/2026', total: 75 },
  diferenca: 17,
  percentual: 29.31,
  efeitos: { preco: 3, quantidade: 12, novos: 8, sairam: 6 },
  itens: [
    { descricao: 'Arroz', diferenca: 12, percentual: 100, mudancas: ['QUANTIDADE'], anterior: { quantidade: 1, valor: 12, total: 12 }, atual: { quantidade: 2, valor: 12, total: 24 } },
    { descricao: 'Pão', diferenca: 8, mudancas: ['NOVO'], anterior: null, atual: { quantidade: 4, valor: 2, total: 8 } },
    { descricao: 'Biscoito', diferenca: -6, mudancas: ['SAIU'], anterior: { quantidade: 1, valor: 6, total: 6 }, atual: null },
    { descricao: 'Café', diferenca: 4, percentual: 20, mudancas: ['PRECO_SUBIU'], anterior: { quantidade: 1, valor: 20, total: 20 }, atual: { quantidade: 1, valor: 24, total: 24 } },
    { descricao: 'Sal', diferenca: 0, mudancas: [], anterior: { quantidade: 1, valor: 3, total: 3 }, atual: { quantidade: 1, valor: 3, total: 3 } }
  ],
  destaques: { maiorAltaPreco: { descricao: 'Café', diferenca: 4, percentual: 20 }, maiorImpacto: { descricao: 'Arroz', diferenca: 12, percentual: 100 } },
  semValor: ['Feijão']
};

/** Comparar planejamentos (card #68). */
describe('CompararComponent', () => {
  let fixture: ComponentFixture<CompararComponent>;
  let tela: CompararComponent;
  let service: jasmine.SpyObj<ListaService>;
  let alerta: jasmine.SpyObj<AlertService>;
  let confirmacao: jasmine.SpyObj<ConfirmacaoService>;
  let router: Router;
  let parametros: BehaviorSubject<ReturnType<typeof convertToParamMap>>;
  let consulta: BehaviorSubject<ReturnType<typeof convertToParamMap>>;
  const el = () => fixture.nativeElement as HTMLElement;
  const texto = () => (el().textContent ?? '').replace(/\s+/g, '');

  function montar() {
    fixture = TestBed.createComponent(CompararComponent);
    tela = fixture.componentInstance;
    fixture.detectChanges();
  }

  beforeEach(() => {
    parametros = new BehaviorSubject(convertToParamMap({ id: '2' }));
    consulta = new BehaviorSubject(convertToParamMap({}));
    service = jasmine.createSpyObj<ListaService>('ListaService', ['obterPorId', 'serie', 'comparar', 'definirSerie', 'listar']);
    service.obterPorId.and.returnValue(of(lista({})));
    service.serie.and.returnValue(of([lista({ id: 1, nome: 'Compras · out/2026', arquivadaEm: '2026-11-01T00:00:00Z' }), lista({})]));
    service.comparar.and.returnValue(of(comparacao));
    service.definirSerie.and.returnValue(of(null));
    service.listar.and.callFake((arq?: boolean) => of(arq ? [lista({ id: 7, nome: 'Mercado antigo' })] : [lista({}), lista({ id: 5, nome: 'Feira' })]));
    alerta = jasmine.createSpyObj<AlertService>('AlertService', ['success', 'error', 'info']);
    confirmacao = jasmine.createSpyObj<ConfirmacaoService>('ConfirmacaoService', ['confirmar']);
    confirmacao.confirmar.and.resolveTo(true);
    TestBed.configureTestingModule({
      imports: [CompararComponent],
      providers: [
        provideNoopAnimations(), provideRouter([]),
        { provide: ActivatedRoute, useValue: { paramMap: parametros, queryParamMap: consulta } },
        { provide: ListaService, useValue: service },
        { provide: AlertService, useValue: alerta },
        { provide: ConfirmacaoService, useValue: confirmacao },
        { provide: LarguraTelaService, useValue: { movel: signal(false) } }
      ]
    });
    router = TestBed.inject(Router);
    spyOn(router, 'navigate').and.resolveTo(true);
  });

  it('sem "com" pede o anterior da série à API e mostra o resumo com sinal e seta', () => {
    montar();

    expect(service.comparar).toHaveBeenCalledWith(2, undefined, 'estimado');
    expect(tela.com).toBe(1);
    expect(texto()).toContain('Compras·out/2026R$58,00');
    expect(texto()).toContain('Diferença+R$17,00');
    expect(texto()).toContain('▲+29,3%');
    expect(texto()).toContain('+1/−1');
    expect(tela.opcoesSerie.map(o => o.label)).toEqual(['Compras · out/2026 (arquivado)', 'Compras · nov/2026']);
  });

  it('a URL manda: com e base vão para a API', () => {
    consulta.next(convertToParamMap({ com: '1', base: 'ok' }));
    montar();

    expect(service.comparar).toHaveBeenCalledWith(2, 1, 'ok');
  });

  it('a cascata desenha 6 barras na ordem e o tooltip lista os itens do grupo', () => {
    montar();

    expect(el().querySelectorAll('.comparar-cascata__barra').length).toBe(6);
    expect(Array.from(el().querySelectorAll('.comparar-cascata__rotulo')).map(t => t.textContent?.trim()))
      .toEqual(['Anterior', 'Preço', 'Quantidade', 'Itens novos', 'Itens que saíram', 'Atual']);

    tela.barraAtiva = tela.barras[2];
    fixture.detectChanges();
    expect(el().querySelector('.comparar-cascata__dica')!.textContent).toContain('Arroz');
  });

  it('destaques e o aviso dos itens sem valor', () => {
    montar();

    expect(texto()).toContain('MaioraltadepreçoCafé');
    expect(texto()).toContain('MaiorimpactoArroz');
    expect(texto()).toContain('Foradaconta(semvalor)Feijão');
  });

  it('filtro com contadores (começa em "Com mudança") e busca', () => {
    montar();
    expect(tela.opcoesFiltro.map(o => [o.value, o.contagem])).toEqual(
      [['MUDANCA', 4], ['SUBIU', 2], ['CAIU', 0], ['NOVOS', 1], ['SAIRAM', 1], ['TODOS', 5]]);
    expect(tela.exibidos.map(i => i.descricao)).toEqual(['Arroz', 'Pão', 'Biscoito', 'Café']);

    tela.filtro = 'TODOS';
    tela.busca = 'sal';
    tela.aplicar();
    expect(tela.exibidos.map(i => i.descricao)).toEqual(['Sal']);
  });

  it('trocar o anterior, o atual e a base vai para a URL', () => {
    montar();

    tela.trocarAnterior(1);
    tela.base = 'ok';
    tela.trocarBase();
    tela.trocarAtual(1);

    expect((router.navigate as jasmine.Spy).calls.argsFor(0)[1]).toEqual(jasmine.objectContaining({ queryParams: { com: 1, base: 'estimado' } }));
    expect((router.navigate as jasmine.Spy).calls.argsFor(1)[1]).toEqual(jasmine.objectContaining({ queryParams: { base: 'ok' } }));
    expect(router.navigate).toHaveBeenCalledWith(['/planejamento', '1', 'comparar'], { queryParams: { com: null, base: 'ok' } });
  });

  it('sem anterior na série: estado vazio e "Ligar a este" com os de fora da série', () => {
    service.comparar.and.returnValue(throwError(() => ({ status: 409, error: { message: 'Não há lista anterior na série.' } })));
    montar();
    fixture.detectChanges();

    expect(texto()).toContain('Nadaparacompararainda');
    expect(tela.candidatos.map(c => c.nome)).toEqual(['Feira', 'Mercado antigo']);
    expect(alerta.error).not.toHaveBeenCalled();

    tela.ligarCom = 5;
    tela.ligarSerie();
    expect(service.definirSerie).toHaveBeenCalledWith(2, 5);
  });

  it('mensagens da API com "lista" aparecem como "planejamento"', () => {
    service.comparar.and.returnValue(throwError(() => ({ status: 409, error: { message: 'As listas não são da mesma série.' } })));
    montar();

    expect(alerta.error).toHaveBeenCalledWith('Os planejamentos não são da mesma série.');
  });

  it('sair da série confirma e tira o planejamento dela', async () => {
    montar();

    await tela.sairDaSerie();

    expect(service.definirSerie).toHaveBeenCalledWith(2, null);
  });

  it('exportar baixa o CSV com os nomes dos dois lados; voltar leva ao planejamento', () => {
    montar();
    const nomes: string[] = [];
    spyOn(HTMLAnchorElement.prototype, 'click').and.callFake(function (this: HTMLAnchorElement) { nomes.push(this.download); });

    tela.exportarCsv();
    tela.voltar();

    expect(nomes).toEqual(['comparacao-compras-out-2026-x-compras-nov-2026.csv']);
    expect(router.navigate).toHaveBeenCalledWith(['/planejamento', '2']);
  });

  it('nenhum texto da tela usa "lista"', () => {
    montar();

    expect(el().textContent).not.toMatch(/\blistas?\b/i);
  });
});
