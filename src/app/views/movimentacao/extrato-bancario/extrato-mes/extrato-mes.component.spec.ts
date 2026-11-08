import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { ConfirmationService, MessageService } from 'primeng/api';
import { of, throwError } from 'rxjs';
import { ConfirmacaoService } from 'src/app/core/services/confirmacao.service';
import { ExtratoBancarioItemService } from 'src/app/core/services/extrato-bancario-item.service';
import { BancoService } from 'src/app/core/services/banco.service';
import { TipoCartaoService } from 'src/app/core/services/tipo-cartao.service';
import { CategoryService } from 'src/app/core/services/category.service';
import { PessoaMovimentacaoService } from 'src/app/core/services/pessoa-movimentacao.service';
import { TipoMovimentacaoService } from 'src/app/core/services/tipo-movimentacao.service';
import { LarguraTelaService } from 'src/app/core/services/largura-tela.service';
import { AlertService } from 'src/app/shared/components/alert.service';
import { RegraClassificacaoService } from 'src/app/core/services/regra-classificacao.service';
import { ExtratoItemDto } from 'src/app/core/models/extrato.model';

import { ExtratoMesComponent } from './extrato-mes.component';

/** Tela única do Extrato no layout novo (card #45, parte 1): leitura no desktop. */
describe('ExtratoMesComponent', () => {
  let fixture: ComponentFixture<ExtratoMesComponent>;
  let itens: jasmine.SpyObj<ExtratoBancarioItemService>;
  const movel = signal(false);
  let queryParams: Record<string, string> = {};

  const dados = (): ExtratoItemDto[] => [
    { id: 1, dataMovimentacao: '2026-10-05', valor: 100, tipoLancamento: 'Saída', bancoId: 1, descricao: 'Mercado Extra',
      categoriaId: 5, categoriaNome: 'Casa', nomePessoaTransacao: 'Carlos', ehParcelado: true, parcelaAtual: 2, quantidadeParcelas: 4 },
    { id: 2, dataMovimentacao: '2026-10-05', valor: 1000, tipoLancamento: 'Entrada', bancoId: 2, descricao: 'Salário' },
    { id: 3, dataMovimentacao: '2026-10-01', valor: 30, tipoLancamento: 'Saída', bancoId: 1, descricao: 'Padaria' }
  ];

  const comp = () => fixture.componentInstance;
  const el = () => fixture.nativeElement as HTMLElement;
  const texto = (e: Element | null | undefined) => (e?.textContent ?? '').replace(/\s+/g, ' ');
  const abrir = () => {
    fixture = TestBed.createComponent(ExtratoMesComponent);
    fixture.detectChanges();
  };

  let regras: jasmine.SpyObj<RegraClassificacaoService>;

  beforeEach(() => {
    regras = jasmine.createSpyObj<RegraClassificacaoService>('RegraClassificacaoService', ['listar', 'sugestoes', 'previa']);
    regras.previa.and.returnValue(of({ total: 0, semCategoria: 0, conflitos: 0, exemplos: [], exemplosConflito: [] }));
    regras.listar.and.returnValue(of([{ id: 1, texto: 'PADARIA', categoriaId: 5, ativa: true }]));
    regras.sugestoes.and.returnValue(of([]));
    movel.set(false);
    queryParams = {};
    itens = jasmine.createSpyObj<ExtratoBancarioItemService>('ExtratoBancarioItemService', ['listarDoMes', 'atualizar', 'excluir', 'acertos']);
    itens.acertos.and.returnValue(of({
      pessoas: [{
        pessoaId: 7, nome: 'CARLOS', ehTitular: false, devido: 140, recebido: 30, falta: 110, quitado: false, aindaVaiCobrar: 0,
        compras: [
          { id: 1, data: '2026-10-05', descricao: 'Mercado Extra', valor: 100, bancoId: 1, bancoNome: 'Nubank', parcelaAtual: 2, quantidadeParcelas: 4, pago: 30, quitada: false },
          { id: 99, data: '2026-09-05', descricao: 'De outra fatura', valor: 40, bancoId: 1, bancoNome: 'Nubank', parcelaAtual: null, quantidadeParcelas: null, pago: 0, quitada: false }
        ],
        pagamentos: [], proximasParcelas: []
      }],
      eu: null, totais: { devido: 140, recebido: 30, faltaReceber: 120, aindaVaiCobrar: 0 }
    }));
    itens.listarDoMes.and.returnValue(of(dados()));
    const comLista = <T>(nome: string, metodo: string, lista: T[]) => {
      const spy = jasmine.createSpyObj(nome, [metodo]);
      spy[metodo].and.returnValue(of(lista));
      return spy;
    };

    TestBed.configureTestingModule({
      imports: [ExtratoMesComponent],
      providers: [
        provideRouter([]), provideNoopAnimations(), ConfirmationService, MessageService,
        { provide: ActivatedRoute, useValue: { snapshot: { get queryParamMap() { return convertToParamMap(queryParams); } } } },
        { provide: ExtratoBancarioItemService, useValue: itens },
        { provide: BancoService, useValue: comLista('BancoService', 'listar', [
          { id: 1, nomeBanco: 'Nubank', tipoCartaoId: 2, ativo: true, saldoInicial: 0 },
          { id: 2, nomeBanco: 'Caixa', tipoCartaoId: 1, ativo: true, saldoInicial: 0 }
        ]) },
        { provide: TipoCartaoService, useValue: comLista('TipoCartaoService', 'listar', [
          { id: 1, nomeTipoCartao: 'Conta corrente', ehCredito: false, ehSistema: true },
          { id: 2, nomeTipoCartao: 'Cartão de crédito', ehCredito: true, ehSistema: true }
        ]) },
        { provide: CategoryService, useValue: comLista('CategoryService', 'listar', [
          { id: 5, nome: 'Casa', subcategoria: 'Despesa', naturezaOperacao: 1, ativo: true }
        ]) },
        { provide: PessoaMovimentacaoService, useValue: comLista('PessoaMovimentacaoService', 'listar', []) },
        { provide: TipoMovimentacaoService, useValue: comLista('TipoMovimentacaoService', 'listar', []) },
        { provide: RegraClassificacaoService, useValue: regras },
        { provide: AlertService, useValue: jasmine.createSpyObj('AlertService', ['success', 'error', 'info']) },
        { provide: LarguraTelaService, useValue: { movel } }
      ]
    });
  });

  it('cabeçalho como Contas a Pagar: mês, Modo edição na caixa e "Novo lançamento" com Importar e o resto na seta', () => {
    abrir();

    expect(itens.listarDoMes).toHaveBeenCalled();
    expect(el().querySelector('.mf-page-title')?.textContent).toContain('Extrato Bancário');
    expect(el().querySelector('.modo-edicao #extrato-edicao')).not.toBeNull();
    expect(el().querySelector('p-splitbutton')?.textContent).toContain('Novo lançamento');
    expect(comp().itensNovoLancamento.map(i => i.label)).toEqual(
      ['Importar extrato', 'Importações mensais', 'Relatório mensal', 'Configurar pessoas', 'Regras de classificação', 'Atualizar']);
    expect(el().querySelector('mf-page-header [aria-label="Mais ações"]')).toBeNull();
  });

  it('abas Lançamentos | Acertos com pessoas, com o selo do que falta receber', () => {
    abrir();
    fixture.detectChanges();
    const abas = Array.from(el().querySelectorAll('.extrato-aba')).map(texto);
    expect(abas.length).toBe(2);
    expect(abas[0]).toContain('Lançamentos');
    expect(abas[1]).toContain('Acertos com pessoas');
    expect(abas[1]).toContain('120,00');
    expect(el().querySelector('app-acertos')).not.toBeNull();
  });

  it('cartão de crédito escolhido mostra a fatura dividida por pessoa, com o devolvido dos Acertos; "Ver acertos" troca de aba', () => {
    abrir();
    expect(el().querySelector('app-fatura-por-pessoa')).toBeNull();

    comp().escolherConta(1);
    fixture.detectChanges();
    expect(el().querySelector('app-fatura-por-pessoa')).not.toBeNull();
    // O devolvido é o pago das compras desta fatura, de qualquer data (o pagamento costuma vir em outro mês).
    expect(itens.acertos).toHaveBeenCalledWith({ inicio: null, fim: null, bancoId: 1 });
    expect(comp().devolvidoFatura).toBe(30);
    expect(comp().faltaFatura).toBe(70);
    expect(comp().fatura?.total).toBe(130);

    comp().verAcertos();
    expect(comp().aba).toBe(1);
    comp().escolherConta(2);
    expect(comp().fatura).toBeNull();
  });

  it('abre no mês e na conta da URL (o antigo /detalhes redireciona para cá)', () => {
    queryParams = { month: '2026-10', bancoId: '1' };
    abrir();

    expect(itens.listarDoMes.calls.mostRecent().args[0]).toBe('2026-10');
    expect(comp().filtro.bancoId).toBe(1);
  });

  it('contas à esquerda: "Todas as contas" e uma por banco; clicar filtra a tela', () => {
    abrir();
    const contas = Array.from(el().querySelectorAll('.extrato-conta')).map(texto);

    expect(contas[0]).toContain('Todas as contas');
    expect(contas.some(c => c.includes('Nubank') && c.includes('Cartão de crédito'))).toBeTrue();

    (Array.from(el().querySelectorAll('.extrato-conta')).find(c => c.textContent?.includes('Caixa')) as HTMLElement).click();
    fixture.detectChanges();

    expect(comp().filtro.bancoId).toBe(2);
    expect(el().querySelectorAll('.extrato-linha').length).toBe(1);
  });

  it('cards de Saídas, Entradas, Sem pessoa e Sem categoria; clicar em Sem pessoa filtra', () => {
    abrir();
    const cards = Array.from(el().querySelectorAll('.extrato-card mf-stat-card')).map(texto);

    expect(cards.length).toBe(4);
    expect(cards[0]).toContain('R$ 130,00');
    expect(cards[1]).toContain('R$ 1.000,00');
    expect(cards[2]).toContain('1');
    expect(cards[3]).toContain('2');

    (el().querySelectorAll('.extrato-card')[2] as HTMLElement).click();
    fixture.detectChanges();

    expect(comp().filtro.pendencia).toBe('sem-pessoa');
    expect(el().querySelectorAll('.extrato-linha').length).toBe(1);
  });

  it('tabela agrupada por dia, com chip de pessoa, parcela e valor (entrada com "+")', () => {
    abrir();

    expect(Array.from(el().querySelectorAll('.extrato-dia')).map(d => texto(d))).toEqual([
      jasmine.stringContaining('5 de outubro'), jasmine.stringContaining('1 de outubro')
    ] as unknown as string[]);
    const linhas = Array.from(el().querySelectorAll('.extrato-linha'));
    const mercado = linhas.find(l => l.textContent?.includes('Mercado Extra'))!;
    expect(texto(mercado)).toContain('Casa');
    expect(texto(mercado.querySelector('.extrato-pessoa'))).toContain('Carlos');
    expect(texto(mercado)).toContain('2 / 4');
    expect(texto(linhas.find(l => l.textContent?.includes('Salário')))).toContain('+ R$ 1.000,00');
    expect(texto(linhas.find(l => l.textContent?.includes('Padaria'))?.querySelector('.extrato-pessoa'))).toContain('Sem pessoa');
  });

  it('as opções do Todos/Saídas/Entradas não mudam de referência sem mudar o filtro', () => {
    abrir();
    const opcoes = comp().opcoesTipo;
    fixture.detectChanges();
    expect(comp().opcoesTipo).toBe(opcoes);
  });

  it('filtros como Contas a Pagar: contagem em cada opção (com os outros filtros) e Exportar na barra', () => {
    abrir();
    expect(comp().opcoesTipo.map(o => [o.value, o.contagem])).toEqual([['todos', 3], ['saidas', 2], ['entradas', 1]]);
    expect(texto(el().querySelector('mf-filter-bar p-selectbutton'))).toContain('Saídas2');

    comp().filtro = { ...comp().filtro, busca: 'padaria' };
    comp().aoMudarFiltro();
    expect(comp().opcoesTipo.map(o => o.contagem)).toEqual([1, 1, 0]);

    fixture.detectChanges();
    expect(el().querySelector('mf-filter-bar [aria-label="Exportar"]')).not.toBeNull();
    expect(comp().itensMenu.map(i => i.label)).not.toContain('Exportar');
  });

  it('ações por linha como Contas a Pagar: o lápis liga o Modo edição e leva à linha; o ⋮ exclui com confirmação', async () => {
    abrir();
    const linha = Array.from(el().querySelectorAll('.extrato-linha')).find(l => texto(l).includes('Padaria'))!;
    expect(linha.querySelector('[aria-label="Editar"]')).not.toBeNull();
    expect(linha.querySelector('[aria-label="Mais ações"]')).not.toBeNull();

    (linha.querySelector('[aria-label="Editar"]') as HTMLButtonElement).click();
    expect(comp().edicao).toBeTrue();
    expect(comp().destacado).toBe(3);

    await comp().alternarEdicao(false);
    const confirmacao = TestBed.inject(ConfirmacaoService);
    spyOn(confirmacao, 'confirmar').and.resolveTo(true);
    itens.excluir.and.returnValue(of({}));
    spyOn(comp().menuLinha!, 'toggle');
    comp().abrirMenuLinha(new MouseEvent('click'), dados()[2]);
    await comp().itensMenuLinha[0].command!({});
    expect(confirmacao.confirmar).toHaveBeenCalled();
    expect(itens.excluir).toHaveBeenCalledWith(3);
  });

  it('busca e limpar filtros', () => {
    abrir();
    comp().filtro = { ...comp().filtro, busca: 'padaria' };
    comp().aoMudarFiltro();
    fixture.detectChanges();
    expect(el().querySelectorAll('.extrato-linha').length).toBe(1);

    comp().limparFiltros();
    fixture.detectChanges();
    expect(el().querySelectorAll('.extrato-linha').length).toBe(3);
  });

  describe('Modo edição (item 3)', () => {
    const ligar = () => {
      comp().alternarEdicao(true);
      fixture.detectChanges();
    };

    beforeEach(() => {
      itens.atualizar.and.returnValue(of(null));
      itens.excluir.and.returnValue(of(null));
      abrir();
    });

    it('switch no cabeçalho; ligado, as linhas viram campos e a troca de mês trava', () => {
      expect(el().querySelector('#extrato-edicao')).not.toBeNull();
      ligar();
      expect(el().querySelectorAll('.extrato-linha--edicao').length).toBe(3);
      expect(el().querySelector('app-barra-edicao')?.textContent).toContain('os lançamentos');
      const anterior = el().querySelector('[aria-label="Mês anterior"] button, button[aria-label="Mês anterior"]') as HTMLButtonElement;
      expect(anterior.disabled).toBeTrue();
      comp().mudarMes(1);
      expect(itens.listarDoMes).toHaveBeenCalledTimes(1);
    });

    it('mexer conta a alteração; Salvar grava só os alterados e sai do Modo edição', () => {
      ligar();
      comp().rascunho[3].descricao = 'Padaria do bairro';
      comp().aoEditar();
      expect(comp().alteracoes).toBe(1);
      expect(comp().alterado(dados()[2], 'descricao')).toBeTrue();

      comp().salvarEdicao();
      expect(itens.atualizar).toHaveBeenCalledTimes(1);
      expect(itens.atualizar).toHaveBeenCalledWith(jasmine.objectContaining({ id: 3, descricao: 'Padaria do bairro', dataMovimentacao: '2026-10-01' }));
      expect(comp().edicao).toBeFalse();
      expect(itens.listarDoMes).toHaveBeenCalledTimes(2);
    });

    it('categoria nova ao salvar vira a pergunta "Sempre classificar…?" (sem repetir regra que já existe)', () => {
      ligar();
      comp().rascunho[1].categoriaId = 9;   // Mercado Extra (Carlos): proposta nova
      comp().rascunho[3].categoriaId = 5;   // Padaria: já tem regra
      comp().aoEditar();
      comp().salvarEdicao();

      expect(comp().propostas).toEqual([{ texto: 'CARLOS', categoriaId: 9, tipoMovimentacaoId: null }]);
      expect(document.querySelector('app-classificar-sempre')).toBeDefined();

      comp().aoConcluirRegras([1]);
      expect(comp().propostas).toEqual([]);
      expect(itens.listarDoMes).toHaveBeenCalledTimes(3);
      fixture.detectChanges();
      expect(comp().acabouDeClassificar(dados()[0])).toBeTrue();
      expect(el().textContent).toContain('acabou de ser classificado');

      // "Editar" do "Criar regra?": abre a tela de regras com a frase preenchida.
      comp().editarProposta({ texto: 'CARLOS', categoriaId: 9, tipoMovimentacaoId: null });
      expect(comp().showRegras).toBeTrue();
      expect(comp().regraInicial).toEqual({ texto: 'CARLOS', categoriaId: 9, tipoMovimentacaoId: null });
    });

    it('sem categoria mostra a sugestão do histórico; um clique aplica no rascunho', () => {
      regras.sugestoes.and.returnValue(of([{ itemId: 3, categoriaId: 5, vezes: 4 }]));
      comp().carregarMes();
      ligar();

      expect(regras.sugestoes).toHaveBeenCalledWith([2, 3]);
      expect(comp().sugestao(dados()[2])).toEqual({ categoriaId: 5, nome: 'Casa' });
      expect(comp().sugestao(dados()[2])).toBe(comp().sugestao(dados()[2])); // mesmo objeto: a folha não reinicia
      const botao = el().querySelector('.extrato-sugestao') as HTMLButtonElement;
      expect(botao.textContent).toContain('Casa');
      botao.click();
      expect(comp().rascunho[3].categoriaId).toBe(5);
      expect(comp().alteracoes).toBe(1);
      fixture.detectChanges();
      expect(el().querySelector('.extrato-sugestao')).toBeNull();
    });

    it('ordenar por maior valor tira os dias; voltar para data traz de volta; limpar filtros não mexe na ordem', () => {
      comp().ordem = 'valor';
      comp().aoMudarFiltro();
      expect(comp().exibidos.map(i => i.id)).toEqual([2, 1, 3]);
      expect(comp().diasMovel.length).toBe(1);
      expect(comp().diasMovel[0].titulo).toBe('Maior valor');
      fixture.detectChanges();
      expect(el().querySelectorAll('.extrato-dia').length).toBe(0);
      expect(el().querySelectorAll('tbody tr').length).toBe(3);

      comp().filtro = { ...comp().filtro, valorMin: 50 };
      comp().aoMudarFiltro();
      expect(comp().exibidos.map(i => i.id)).toEqual([2, 1]);
      expect(comp().temFiltro).toBeTrue();
      expect(comp().rotuloValor).toContain('a partir de');

      comp().limparFiltros();
      expect(comp().ordem).toBe('valor');
      expect(comp().exibidos.length).toBe(3);

      comp().ordem = 'data';
      comp().aoMudarFiltro();
      expect(comp().diasMovel.length).toBe(2);
      fixture.detectChanges();
      expect(el().querySelectorAll('.extrato-dia').length).toBe(2);
    });

    it('erro ao salvar avisa e continua no Modo edição com o rascunho', () => {
      itens.atualizar.and.returnValue(throwError(() => ({ error: { message: 'Fora do ar' } })));
      ligar();
      comp().rascunho[1].valor = 150;
      comp().aoEditar();
      comp().salvarEdicao();
      expect(comp().edicao).toBeTrue();
      expect(comp().rascunho[1].valor).toBe(150);
      expect(comp().salvando).toBeFalse();
    });

    it('Descartar sai do Modo edição como em Contas a Pagar: sem alterações direto; com alterações pede confirmação', async () => {
      const confirmacao = TestBed.inject(ConfirmacaoService);
      const pergunta = spyOn(confirmacao, 'confirmar').and.resolveTo(false);
      ligar();
      await comp().descartarEdicao();
      expect(comp().edicao).toBeFalse();
      expect(pergunta).not.toHaveBeenCalled();

      ligar();
      comp().rascunho[2].descricao = 'Salário de outubro';
      comp().aoEditar();
      await comp().descartarEdicao();
      expect(pergunta).toHaveBeenCalledTimes(1);
      expect(comp().edicao).toBeTrue();

      pergunta.and.resolveTo(true);
      await comp().descartarEdicao();
      expect(comp().edicao).toBeFalse();
      expect(comp().alteracoes).toBe(0);
    });

    it('no Modo edição a tabela usa a largura toda (as contas saem) e cada campo tem a sua coluna', () => {
      ligar();
      expect(el().querySelector('app-extrato-contas')).toBeNull();
      const cabecalho = Array.from(el().querySelectorAll('.extrato-tabela--edicao thead th')).map(texto);
      expect(cabecalho.map(t => t.trim())).toEqual(['', 'Data', 'Descrição', 'Categoria', 'Pessoa', 'Tipo de movimentação', 'Parcela', 'Valor']);
    });

    it('seleção com o total e Excluir um ou vários com confirmação', async () => {
      const confirmacao = TestBed.inject(ConfirmacaoService);
      spyOn(confirmacao, 'confirmar').and.resolveTo(true);
      ligar();
      comp().aoSelecionar([dados()[0], dados()[1]]);
      fixture.detectChanges();
      expect(comp().totaisSelecao).toEqual(jasmine.objectContaining({ receita: 1000, despesa: 100, count: 2 }));
      expect(el().querySelector('app-totais-selecao')).not.toBeNull();

      comp().excluirSelecionados();
      await fixture.whenStable();
      expect(itens.excluir).toHaveBeenCalledWith(1);
      expect(itens.excluir).toHaveBeenCalledWith(2);
      expect(comp().excluindo).toBeFalse();
      expect(comp().selecao).toEqual([]);
    });

    it('pessoa digitada com nome cadastrado liga pelo id', () => {
      comp().pessoasCadastradas = [{ id: 9, nomePessoa: 'Giovanne', categoriaId: null, tipoMovimentacaoId: null }];
      ligar();
      comp().editarPessoa(dados()[2], 'giovanne');
      expect(comp().rascunho[3]).toEqual(jasmine.objectContaining({ pessoaMovimentacaoId: 9, nomePessoaTransacao: 'Giovanne' }));
      expect(comp().alteracoes).toBe(1);
    });
  });

  describe('celular (item 4)', () => {
    beforeEach(() => {
      movel.set(true);
      itens.atualizar.and.returnValue(of(null));
      itens.excluir.and.returnValue(of(null));
      abrir();
    });

    it('sem o switch do Modo edição; contas em chips; cards por dia do mais recente; + flutuante; Importar no ⋮', () => {
      expect(el().querySelector('#extrato-edicao')).toBeNull();
      expect(el().querySelectorAll('.extrato-chip').length).toBe(3);
      expect(el().querySelector('p-table')).toBeNull();
      const dias = Array.from(el().querySelectorAll('.extrato-movel__dia')).map(texto);
      expect(dias.length).toBe(2);
      expect(dias[0]).toContain('5 de outubro');
      expect(el().querySelectorAll('.extrato-movel__item').length).toBe(3);
      expect(Array.from(el().querySelectorAll('.extrato-movel__item')).map(texto).find(t => t.includes('Mercado Extra'))).toContain('Carlos');
      expect(el().querySelector('mf-fab')).not.toBeNull();
      // Como Contas a Pagar: o mês sai do cabeçalho e vai em largura total logo abaixo; o ⋮ fica no título.
      expect(el().querySelector('mf-page-header .campo-mes')).toBeNull();
      expect(el().querySelector('.mes-movel p-calendar')).not.toBeNull();
      expect(el().querySelector('mf-page-header [aria-label="Mais ações"]')).not.toBeNull();
      expect(comp().itensMenuMovel.map(i => i.label)[0]).toBe('Importar extrato');
      expect(el().textContent).not.toContain('Importar extrato');
    });

    it('filtros como Contas a Pagar no celular: opções roláveis com contagem, busca e o botão que abre a folha de filtros', () => {
      expect(el().querySelector('mf-filter-bar')).toBeNull();
      expect(texto(el().querySelector('.filtro-rolavel p-selectbutton'))).toContain('Todos3');
      expect(el().querySelector('.extrato-busca-movel input')).not.toBeNull();
      expect(comp().filtrosNoPainel).toBe(0);

      (el().querySelector('.botao-filtros button') as HTMLButtonElement).click();
      expect(comp().filtrosAbertos).toBeTrue();
      comp().filtro = { ...comp().filtro, pessoas: ['Carlos'], categorias: [5] };
      comp().aoMudarFiltro();
      fixture.detectChanges();
      expect(comp().filtrosNoPainel).toBe(2);
      expect(texto(el().querySelector('.botao-filtros'))).toContain('2');
    });

    it('tocar no card abre a folha; Salvar grava o lançamento e recarrega', () => {
      (el().querySelectorAll('.extrato-movel__item')[0] as HTMLButtonElement).click();
      fixture.detectChanges();
      expect(comp().noSheet?.id).toBeDefined();
      const editado = { ...comp().noSheet!, descricao: 'Mudou' };
      comp().salvarDoSheet(editado);
      expect(itens.atualizar).toHaveBeenCalledWith(jasmine.objectContaining({ id: editado.id, descricao: 'Mudou' }));
      expect(comp().noSheet).toBeNull();
      expect(itens.listarDoMes).toHaveBeenCalledTimes(2);
    });

    it('Excluir pela folha confirma antes', async () => {
      const confirmacao = TestBed.inject(ConfirmacaoService);
      spyOn(confirmacao, 'confirmar').and.resolveTo(true);
      await comp().excluirDoSheet(dados()[2]);
      expect(confirmacao.confirmar).toHaveBeenCalled();
      expect(itens.excluir).toHaveBeenCalledWith(3);
      expect(comp().noSheet).toBeNull();
    });
  });
});
