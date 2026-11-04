import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { ActivatedRoute, Router, convertToParamMap, provideRouter } from '@angular/router';
import { MessageService } from 'primeng/api';
import { BehaviorSubject, of, throwError } from 'rxjs';

import { PlanejamentoComponent } from './planejamento.component';
import { ListaService } from 'src/app/core/services/lista.service';
import { ItemListaService } from 'src/app/core/services/item-lista.service';
import { ConfirmacaoService } from 'src/app/core/services/confirmacao.service';
import { AlertService } from 'src/app/shared/components/alert.service';
import { LarguraTelaService } from 'src/app/core/services/largura-tela.service';
import { ItemListaDto, ListaDto } from 'src/app/core/models/lista.model';

/** Tela interna do planejamento (card #66). */
describe('PlanejamentoComponent', () => {
  let fixture: ComponentFixture<PlanejamentoComponent>;
  let tela: PlanejamentoComponent;
  let listas: jasmine.SpyObj<ListaService>;
  let itens: jasmine.SpyObj<ItemListaService>;
  let confirmacao: jasmine.SpyObj<ConfirmacaoService>;
  let alerta: jasmine.SpyObj<AlertService>;
  let router: Router;
  let parametros: BehaviorSubject<ReturnType<typeof convertToParamMap>>;
  const el = () => fixture.nativeElement as HTMLElement;
  const texto = () => (el().textContent ?? '').replace(/\s+/g, ' ');
  /** Os cards de resumo juntam rótulo e valor sem espaço. */
  const compacto = () => (el().textContent ?? '').replace(/\s+/g, '');
  const nomes = () => Array.from(el().querySelectorAll('.planejamento-linha:not(.planejamento-linha--cabecalho) .planejamento-linha__item'))
    .map(e => e.textContent?.trim());

  const compras: ListaDto = {
    id: 8, nome: 'Lista de compras', usaQuantidade: true, usaValor: true, modoValor: 'UNITARIO', usaLimite: true, limite: 30,
    usaData: false, usaObservacao: false, modelo: 'COMPRAS', cor: 'laranja'
  };
  const doMercado: ItemListaDto[] = [
    { id: 3, descricao: 'Leite', feito: false, quantidade: 2, valor: 5 },
    { id: 1, descricao: 'Arroz', feito: true, quantidade: 1, valor: 20 },
    { id: 2, descricao: 'Feijão', feito: false, quantidade: 1, valor: null },
    { id: 4, descricao: 'Café', feito: true, quantidade: 1, valor: 15, repeticao: 'NENHUMA' }
  ];

  function montar(lista: ListaDto = compras, dados: ItemListaDto[] = doMercado) {
    listas.obterPorId.and.returnValue(of(lista));
    itens.listarDaLista.and.returnValue(of(dados.map(i => ({ ...i }))));
    fixture = TestBed.createComponent(PlanejamentoComponent);
    tela = fixture.componentInstance;
    fixture.detectChanges();
  }

  beforeEach(() => {
    parametros = new BehaviorSubject(convertToParamMap({ id: '8' }));
    listas = jasmine.createSpyObj<ListaService>('ListaService', ['obterPorId', 'arquivar', 'desarquivar', 'excluir', 'duplicar']);
    listas.arquivar.and.returnValue(of(null));
    listas.desarquivar.and.returnValue(of(null));
    listas.excluir.and.returnValue(of(null));
    itens = jasmine.createSpyObj<ItemListaService>('ItemListaService',
      ['listarDaLista', 'listarPeriodo', 'alterarOcorrencia', 'marcarFeito', 'desmarcarTodos', 'excluirConcluidos', 'criar', 'atualizar', 'excluir']);
    itens.listarPeriodo.and.returnValue(of([]));
    itens.marcarFeito.and.returnValue(of({ afetados: 1 }));
    itens.desmarcarTodos.and.returnValue(of({ afetados: 2 }));
    itens.excluirConcluidos.and.returnValue(of({ afetados: 2 }));
    itens.criar.and.callFake((_l, dto) => of({ ...dto, id: 90 } as ItemListaDto));
    confirmacao = jasmine.createSpyObj<ConfirmacaoService>('ConfirmacaoService', ['confirmar']);
    confirmacao.confirmar.and.resolveTo(true);
    alerta = jasmine.createSpyObj<AlertService>('AlertService', ['success', 'error', 'info']);
    TestBed.configureTestingModule({
      imports: [PlanejamentoComponent],
      providers: [
        provideNoopAnimations(), provideRouter([]),
        { provide: ActivatedRoute, useValue: { paramMap: parametros } },
        { provide: ListaService, useValue: listas },
        { provide: ItemListaService, useValue: itens },
        { provide: ConfirmacaoService, useValue: confirmacao },
        { provide: AlertService, useValue: alerta },
        // Desktop: o Karma roda numa janela estreita.
        { provide: LarguraTelaService, useValue: { movel: signal(false) } }
      ]
    });
    router = TestBed.inject(Router);
    spyOn(router, 'navigate').and.resolveTo(true);
  });

  it('carrega o planejamento da rota e mostra nome, ícone no título e breadcrumb real (sem a linha dos chips, card #61)', () => {
    montar();

    expect(listas.obterPorId).toHaveBeenCalledWith(8);
    expect(itens.listarDaLista).toHaveBeenCalledWith(8);
    expect(el().querySelector('.mf-page-title')?.textContent).toContain('Lista de compras');
    expect(el().querySelector('mf-page-header mf-category-icon')).not.toBeNull();
    expect(el().querySelector('.planejamento-chip')).toBeNull();
    expect(tela.breadcrumb.map(b => b.label)).toEqual(['Planejamento', 'Meus planejamentos', 'Lista de compras']);
  });

  it('planejamento que não existe (404) avisa sem "lista" e volta para Meus planejamentos', () => {
    listas.obterPorId.and.returnValue(throwError(() => ({ status: 404, error: { mensagem: 'Lista não encontrada.' } })));
    itens.listarDaLista.and.returnValue(of([]));
    fixture = TestBed.createComponent(PlanejamentoComponent);
    fixture.detectChanges();

    expect(alerta.error).toHaveBeenCalledWith('Planejamento não encontrado.');
    expect(router.navigate).toHaveBeenCalledWith(['/planejamento']);
  });

  it('trocar o :id na mesma tela carrega o outro planejamento (Abrir a cópia depois de duplicar)', () => {
    montar();
    listas.obterPorId.and.returnValue(of({ ...compras, id: 9, nome: 'Compras · nov/2026' }));
    itens.listarDaLista.and.returnValue(of([]));
    tela.busca = 'leite';

    parametros.next(convertToParamMap({ id: '9' }));
    fixture.detectChanges();

    expect(listas.obterPorId).toHaveBeenCalledWith(9);
    expect(el().querySelector('.mf-page-title')?.textContent).toContain('Compras · nov/2026');
    expect(tela.itens).toEqual([]);
    expect(tela.busca).toBe('');
  });

  it('resumo com Valor: total, já no carrinho, falta, disponível (limite − total) e progresso', () => {
    montar();
    const t = compacto();

    expect(t).toContain('TotalestimadoR$45,00');
    expect(t).toContain('1semvalor');
    expect(t).toContain('JánocarrinhoR$35,00');
    expect(t).toContain('FaltaR$10,00');
    expect(t).toContain('Disponível-R$15,00');
    expect(t).toContain('Progresso50%');
  });

  it('sem Valor: só o progresso, sem colunas de valor nem rodapé', () => {
    montar({ ...compras, usaValor: false, usaLimite: false, usaQuantidade: false, modelo: 'TAREFAS' });

    expect(texto()).not.toContain('Total estimado');
    expect(texto()).toContain('2 de 4 concluídas');
    expect(el().querySelector('.planejamento-rodape')).toBeNull();
    expect(texto()).not.toContain('Valor un.');
  });

  it('pendentes na ordem de inclusão em cima; feitos agrupados no fim, recolhíveis', () => {
    montar();
    expect(nomes()).toEqual(['Feijão', 'Leite', 'Arroz', 'Café']);
    expect(texto()).toContain('No carrinho (2)');

    tela.feitosAbertos = false;
    fixture.detectChanges();
    expect(nomes()).toEqual(['Feijão', 'Leite']);
  });

  it('modo valor total: uma coluna só de valor (sem "Valor un." repetindo o total)', () => {
    montar({ ...compras, modoValor: 'TOTAL', usaQuantidade: false, usaLimite: false, modelo: 'ORCAMENTO' });
    const cabecalho = el().querySelector('.planejamento-linha--cabecalho')!.textContent!.replace(/\s+/g, ' ');

    expect(cabecalho).toContain('Valor');
    expect(cabecalho).not.toContain('Valor un.');
    expect(cabecalho).not.toContain('Total');
    expect(texto()).toContain('Leite R$ 5,00');
  });

  it('item sem valor mostra "+ valor", que abre a edição', () => {
    montar();
    (el().querySelector('.planejamento-mais-valor') as HTMLButtonElement).click();

    expect(tela.itemAberto).toBeTrue();
    expect(tela.itemEditando?.descricao).toBe('Feijão');
  });

  it('marca em 1 clique, já atualiza o resumo e volta se a API falhar', () => {
    montar();
    const leite = tela.itens.find(i => i.id === 3)!;

    tela.alternar(leite);
    expect(itens.marcarFeito).toHaveBeenCalledWith(8, [3], true);
    expect(tela.resumo.ok).toBe(45);

    itens.marcarFeito.and.returnValue(throwError(() => ({ status: 500 })));
    tela.alternar(tela.itens.find(i => i.id === 2)!);
    expect(tela.itens.find(i => i.id === 2)!.feito).toBeFalse();
    expect(alerta.error).toHaveBeenCalled();
  });

  it('filtro com rótulo do modelo e busca na observação', () => {
    montar({ ...compras, usaObservacao: true }, [...doMercado, { id: 9, descricao: 'Pão', feito: false, observacao: 'integral' }]);

    expect(tela.opcoesFiltro.map(o => [o.label, o.contagem])).toEqual([['Todos', 5], ['Falta', 3], ['No carrinho', 2]]);
    tela.busca = 'INTEGRAL';
    tela.aplicar();
    fixture.detectChanges();
    expect(nomes()).toEqual(['Pão']);
  });

  it('adicionar rápido entra no fim dos pendentes sem recarregar', () => {
    montar();
    itens.listarDaLista.calls.reset();

    tela.aoAdicionar({ id: 90, descricao: 'Açúcar', feito: false, quantidade: 1, valor: 4 });
    fixture.detectChanges();

    expect(nomes().slice(0, 3)).toEqual(['Feijão', 'Leite', 'Açúcar']);
    expect(tela.resumo.total).toBe(49);
    expect(itens.listarDaLista).not.toHaveBeenCalled();
  });

  it('Desmarcar todos confirma e o Desfazer remarca os que estavam feitos', async () => {
    montar();
    const mensagens = fixture.debugElement.injector.get(MessageService);
    spyOn(mensagens, 'add').and.callThrough();

    await tela.desmarcarTodos();

    expect(confirmacao.confirmar.calls.mostRecent().args[0]).toContain('os 2 itens feitos');
    expect(itens.desmarcarTodos).toHaveBeenCalledWith(8);
    const aviso = (mensagens.add as jasmine.Spy).calls.mostRecent().args[0];
    tela.acionarAviso(aviso.data);
    expect(itens.marcarFeito).toHaveBeenCalledWith(8, [1, 4], true);
  });

  it('Excluir concluídos confirma e o Desfazer recria os itens já feitos', async () => {
    montar();
    const mensagens = fixture.debugElement.injector.get(MessageService);
    spyOn(mensagens, 'add').and.callThrough();

    await tela.excluirConcluidos();

    expect(itens.excluirConcluidos).toHaveBeenCalledWith(8);
    const aviso = (mensagens.add as jasmine.Spy).calls.mostRecent().args[0];
    tela.acionarAviso(aviso.data);
    expect(itens.criar).toHaveBeenCalledWith(8, jasmine.objectContaining({ descricao: 'Arroz', feito: true, valor: 20 }));
    expect(itens.criar).toHaveBeenCalledWith(8, jasmine.objectContaining({ descricao: 'Café', feito: true, valor: 15 }));
    expect((itens.criar.calls.argsFor(0)[1] as ItemListaDto).id).toBeUndefined();
  });

  it('cancelar a confirmação não faz nada', async () => {
    montar();
    confirmacao.confirmar.and.resolveTo(false);

    await tela.desmarcarTodos();
    await tela.excluirConcluidos();

    expect(itens.desmarcarTodos).not.toHaveBeenCalled();
    expect(itens.excluirConcluidos).not.toHaveBeenCalled();
  });

  it('arquivado abre só para leitura, com Desarquivar e o voltar para Arquivados', () => {
    montar({ ...compras, arquivadaEm: '2026-10-01T00:00:00Z' });

    expect(texto()).toContain('só para leitura');
    expect(el().querySelector('app-adicionar-item')).toBeNull();
    expect(el().querySelector('.planejamento-mais-valor')).toBeNull();
    expect(texto()).toContain('Desarquivar');
    expect(tela.acoes().map(a => a.rotulo)).toEqual(['Desarquivar', 'Comparar com anterior', 'Compartilhar pendentes', 'Exportar CSV', 'Excluir planejamento']);

    tela.alternar(tela.itens[0]);
    tela.editarItem(tela.itens[0]);
    expect(itens.marcarFeito).not.toHaveBeenCalled();
    expect(tela.itemAberto).toBeFalse();

    tela.voltar();
    expect(router.navigate).toHaveBeenCalledWith(['/planejamento', 'arquivados']);
  });

  it('em uso: o voltar leva a Meus planejamentos; o ⋮ tem campos, seleção, compartilhar, exportar, excluir concluídos, arquivar e excluir', () => {
    montar();
    tela.voltar();

    expect(router.navigate).toHaveBeenCalledWith(['/planejamento']);
    expect(tela.acoes().map(a => a.rotulo)).toEqual(['Campos e aparência', 'Selecionar itens', 'Comparar com anterior', 'Compartilhar pendentes', 'Exportar CSV', 'Excluir concluídos', 'Arquivar', 'Excluir planejamento']);
  });

  it('excluir o planejamento confirma com os itens e volta para Meus planejamentos', async () => {
    montar();

    await tela.excluirPlanejamento();

    expect(confirmacao.confirmar.calls.mostRecent().args[0]).toContain('"Lista de compras" e os 4 itens dele');
    expect(listas.excluir).toHaveBeenCalledWith(8);
    expect(router.navigate).toHaveBeenCalledWith(['/planejamento']);
  });

  it('nenhum texto da tela usa "lista"', () => {
    montar({ ...compras, nome: 'Mercado' });

    expect(texto()).not.toMatch(/\blistas?\b/i);
  });

  describe('ajustes encontrados (card #61)', () => {
    it('concluir pelo botão ✓ da linha (como em Contas a Pagar); clicar de novo desmarca', () => {
      montar();
      const botoes = () => Array.from(el().querySelectorAll<HTMLButtonElement>('.planejamento-linha .planejamento-check'));
      expect(el().querySelector('.planejamento-linha p-checkbox')).toBeNull();
      const leite = botoes().find(b => b.getAttribute('aria-label') === 'Concluir Leite')!;
      leite.click();
      expect(itens.marcarFeito).toHaveBeenCalledWith(8, [3], true);
      fixture.detectChanges();
      const deNovo = botoes().find(b => b.getAttribute('aria-label') === 'Desmarcar Leite')!;
      expect(deNovo.getAttribute('aria-pressed')).toBe('true');
    });

    it('excluir pela lixeira da linha, sem abrir a edição; confirma e o aviso tem Desfazer', async () => {
      itens.excluir.and.returnValue(of(null));
      montar();
      const lixeira = el().querySelector<HTMLElement>('[aria-label="Excluir Leite"] button, button[aria-label="Excluir Leite"]')!;
      expect(lixeira).not.toBeNull();
      await tela.excluirItem(doMercado[0]);
      expect(confirmacao.confirmar).toHaveBeenCalledWith('Excluir o item "Leite"?', jasmine.objectContaining({ titulo: 'Excluir item' }));
      expect(itens.excluir).toHaveBeenCalledWith(8, 3);
      expect(tela.itemAberto).toBeFalse();
    });

    it('cancelar a exclusão da linha não exclui', async () => {
      confirmacao.confirmar.and.resolveTo(false);
      montar();
      await tela.excluirItem(doMercado[0]);
      expect(itens.excluir).not.toHaveBeenCalled();
    });

    it('campo Tipo: coluna depois do Item, filtro pelos tipos usados e sugestões no formulário', () => {
      const comTipo = doMercado.map((i, n) => ({ ...i, tipo: n % 2 ? 'Mercado' : 'Feira' }));
      montar({ ...compras, usaTipo: true }, comTipo);
      const cabecalho = Array.from(el().querySelectorAll('.planejamento-linha--cabecalho span')).map(e => e.textContent?.trim());
      expect(cabecalho.slice(0, 3)).toEqual(['', 'Item', 'Tipo']);
      expect(tela.tiposDisponiveis).toEqual(['Feira', 'Mercado']);
      expect(el().querySelector('.filtro-tipos, p-multiSelect')).not.toBeNull();
      tela.tiposEscolhidos = ['Feira'];
      tela.aplicar();
      expect([...tela.pendentes, ...tela.feitos].every(i => i.tipo === 'Feira')).toBeTrue();
      expect(tela.temFiltro).toBeTrue();
      tela.limparFiltros();
      expect(tela.tiposEscolhidos).toEqual([]);
    });

    it('com Data, a Data é a primeira coluna depois do ✓', () => {
      montar({ ...compras, usaData: true }, doMercado.map(i => ({ ...i, data: '2026-11-04' })));
      tela.visao = 'ITENS';
      fixture.detectChanges();
      const cabecalho = Array.from(el().querySelectorAll('.planejamento-linha--cabecalho span')).map(e => e.textContent?.trim());
      expect(cabecalho.slice(0, 3)).toEqual(['', 'Data', 'Item']);
      expect(tela.colunas.startsWith('2.5rem 8rem minmax(10rem, 1fr)')).toBeTrue();
    });
  });

  describe('seleção em lote (parte 2)', () => {
    it('Selecionar troca o check de feito pelo de seleção; clicar no item seleciona em vez de editar', () => {
      montar();
      tela.entrarSelecao();
      fixture.detectChanges();

      expect(el().querySelectorAll('.planejamento-selecao').length).toBe(4);
      tela.tocarItem(tela.itens.find(i => i.id === 3)!);
      tela.tocarItem(tela.itens.find(i => i.id === 1)!);
      fixture.detectChanges();

      expect(tela.itemAberto).toBeFalse();
      expect([...tela.selecionados]).toEqual([3, 1]);
      expect(compacto()).toContain('2selecionados');
      expect(tela.somaSelecionados).toBe(30);
    });

    it('Selecionar todos pega os visíveis no filtro; Cancelar sai e limpa', () => {
      montar();
      tela.filtro = 'FALTA';
      tela.aplicar();
      tela.entrarSelecao();

      tela.selecionarTodos();
      expect([...tela.selecionados].sort()).toEqual([2, 3]);

      tela.sairSelecao();
      expect(tela.selecionando).toBeFalse();
      expect(tela.selecionados.size).toBe(0);
    });

    it('Marcar feito vai numa requisição só e sai da seleção', () => {
      montar();
      tela.entrarSelecao();
      tela.selecionados = new Set([2, 3]);

      tela.marcarSelecionados(true);

      expect(itens.marcarFeito).toHaveBeenCalledOnceWith(8, [2, 3], true);
      expect(tela.itens.filter(i => i.feito).map(i => i.id).sort()).toEqual([1, 2, 3, 4]);
      expect(tela.selecionando).toBeFalse();
    });

    it('Marcar feito que falha volta cada item ao que era', () => {
      montar();
      itens.marcarFeito.and.returnValue(throwError(() => ({ status: 500 })));
      tela.selecionados = new Set([1, 3]);

      tela.marcarSelecionados(false);

      expect(tela.itens.find(i => i.id === 1)!.feito).toBeTrue();
      expect(tela.itens.find(i => i.id === 3)!.feito).toBeFalse();
      expect(alerta.error).toHaveBeenCalled();
    });

    it('Excluir confirma, apaga um por vez e o Desfazer recria como estavam', async () => {
      montar();
      itens.excluir.and.returnValue(of(null));
      const mensagens = fixture.debugElement.injector.get(MessageService);
      spyOn(mensagens, 'add').and.callThrough();
      tela.selecionados = new Set([3, 1]);

      await tela.excluirSelecionados();

      expect(confirmacao.confirmar.calls.mostRecent().args[0]).toContain('os 2 itens selecionados');
      expect(itens.excluir.calls.allArgs()).toEqual([[8, 3], [8, 1]]);
      const aviso = (mensagens.add as jasmine.Spy).calls.mostRecent().args[0];
      tela.acionarAviso(aviso.data);
      expect(itens.criar).toHaveBeenCalledWith(8, jasmine.objectContaining({ descricao: 'Leite', feito: false, valor: 5 }));
      expect(itens.criar).toHaveBeenCalledWith(8, jasmine.objectContaining({ descricao: 'Arroz', feito: true, valor: 20 }));
    });

    it('arquivado não entra na seleção', () => {
      montar({ ...compras, arquivadaEm: '2026-10-01T00:00:00Z' });

      tela.entrarSelecao();

      expect(tela.selecionando).toBeFalse();
    });
  });

  describe('compartilhar e exportar (parte 2)', () => {
    it('no computador copia os pendentes e avisa', async () => {
      montar();
      const copiar = spyOn(navigator.clipboard, 'writeText').and.resolveTo();

      await tela.compartilharPendentes();

      expect(copiar.calls.mostRecent().args[0]).toContain('☐ Leite × 2 — R$ 10,00');
      expect(alerta.success).toHaveBeenCalled();
    });

    it('exportar baixa planejamento-<nome>.csv', () => {
      montar();
      const cliques: string[] = [];
      spyOn(HTMLAnchorElement.prototype, 'click').and.callFake(function (this: HTMLAnchorElement) { cliques.push(this.download); });

      tela.exportarCsv();

      expect(cliques).toEqual(['planejamento-lista-de-compras.csv']);
    });
  });

  describe('agenda (card #69)', () => {
    const agenda: ListaDto = {
      id: 8, nome: 'Agenda semanal', usaQuantidade: false, usaValor: false, modoValor: 'TOTAL', usaLimite: false,
      usaData: true, usaObservacao: true, modelo: 'AGENDA', cor: 'roxo'
    };
    const daAgenda: ItemListaDto[] = [
      { id: 5, descricao: 'Academia', feito: false, data: '2026-11-02', hora: '07:00:00', repeticao: 'SEMANAL', diasSemana: [1, 3, 5] },
      { id: 6, descricao: 'Dentista', feito: false, data: '2026-11-05', repeticao: 'NENHUMA' }
    ];
    const chave = 'planejamento-visao-8';
    const limpar = () => { try { localStorage.removeItem(chave); } catch { /* sem armazenamento */ } };
    const rotulosDasVisoes = () => Array.from(el().querySelectorAll('.planejamento-visoes .p-button')).map(b => b.textContent!.trim());

    beforeEach(limpar);
    afterEach(limpar);

    it('abre na Semana, com o seletor Dia · Semana · Mês · Itens dentro da navegação e sem o card de Progresso', () => {
      montar(agenda, daAgenda);
      expect(el().querySelector('app-agenda-semana')).not.toBeNull();
      expect(el().querySelector('.agenda-nav__visoes .planejamento-visoes')).not.toBeNull();
      expect(rotulosDasVisoes()).toEqual(['Dia', 'Semana', 'Mês', 'Itens']);
      expect(el().querySelector('mf-stat-card')).toBeNull();
      expect(tela.regras).toEqual({ 5: 'seg, qua e sex', 6: 'não repete' });
    });

    it('a agenda pedir o Dia troca a visão e lembra neste navegador', () => {
      montar(agenda, daAgenda);
      tela.trocarModo('DIA');
      fixture.detectChanges();
      expect(tela.modoAgenda).toBe('DIA');
      expect(localStorage.getItem(chave)).toBe('DIA');

      montar(agenda, daAgenda);
      expect(tela.visao).toBe('DIA');
    });

    it('em Itens: o seletor fica em cima da lista e o resumo volta', () => {
      montar(agenda, daAgenda);
      tela.visao = 'ITENS';
      fixture.detectChanges();
      expect(el().querySelector('app-agenda-semana')).toBeNull();
      expect(el().querySelector('.planejamento-visoes')).not.toBeNull();
      expect(el().querySelector('mf-stat-card')).not.toBeNull();
    });

    it('"Novo item" do cabeçalho na agenda já vem com o dia mostrado', () => {
      montar(agenda, daAgenda);
      tela.novoItem();
      expect(tela.dataInicial).toBe(new Date().toLocaleDateString('sv-SE'));
    });

    it('com Valor, o resumo continua na agenda', () => {
      montar({ ...agenda, usaValor: true }, daAgenda);
      expect(el().querySelector('app-agenda-semana')).not.toBeNull();
      expect(el().querySelector('mf-stat-card')).not.toBeNull();
    });

    it('Mês é uma visão de verdade agora e fica lembrado', () => {
      montar(agenda, daAgenda);
      tela.visao = 'MES';
      tela.lembrarVisao();
      fixture.detectChanges();
      expect(tela.modoAgenda).toBe('MES');
      expect(el().querySelector('app-agenda-semana')).not.toBeNull();
      montar(agenda, daAgenda);
      expect(tela.visao).toBe('MES');
    });

    it('arrastar para outro dia: item que não repete muda a data; o que repete, só aquela ocorrência', () => {
      itens.atualizar.and.callFake((_l, dto) => of(dto as ItemListaDto));
      itens.alterarOcorrencia.and.returnValue(of(null));
      montar(agenda, daAgenda);
      itens.listarDaLista.calls.reset();
      const ocorrencia = (id: number, repete: boolean) => ({
        itemId: id, dataOriginal: '2026-11-04', data: '2026-11-04', feito: false, repete, descricao: 'X'
      });
      tela.moverOcorrencia({ ocorrencia: ocorrencia(6, false), para: '2026-11-06' });
      expect(itens.atualizar).toHaveBeenCalledWith(8, jasmine.objectContaining({ id: 6, descricao: 'Dentista', data: '2026-11-06' }));
      tela.moverOcorrencia({ ocorrencia: ocorrencia(5, true), para: '2026-11-06' });
      expect(itens.alterarOcorrencia).toHaveBeenCalledWith(8, 5, '2026-11-04', { data: '2026-11-06' });
      expect(itens.listarDaLista).toHaveBeenCalledTimes(2);
    });

    it('arrastar que falha avisa e recarrega (o item volta ao lugar)', () => {
      itens.atualizar.and.returnValue(throwError(() => ({ error: { message: 'Fora do ar' } })));
      montar(agenda, daAgenda);
      itens.listarDaLista.calls.reset();
      tela.moverOcorrencia({ ocorrencia: { itemId: 6, dataOriginal: '2026-11-05', data: '2026-11-05', feito: false, repete: false, descricao: 'Dentista' }, para: '2026-11-07' });
      expect(alerta.error).toHaveBeenCalled();
      expect(itens.listarDaLista).toHaveBeenCalledTimes(1);
    });
  });
});
