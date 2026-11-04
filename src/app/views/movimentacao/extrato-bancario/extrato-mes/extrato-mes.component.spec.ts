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

  beforeEach(() => {
    movel.set(false);
    queryParams = {};
    itens = jasmine.createSpyObj<ExtratoBancarioItemService>('ExtratoBancarioItemService', ['listarDoMes', 'atualizar', 'excluir']);
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
        { provide: AlertService, useValue: jasmine.createSpyObj('AlertService', ['success', 'error', 'info']) },
        { provide: LarguraTelaService, useValue: { movel } }
      ]
    });
  });

  it('carrega o mês atual e mostra cabeçalho com Lançamento, Importar extrato e o ⋮', () => {
    abrir();

    expect(itens.listarDoMes).toHaveBeenCalled();
    expect(el().querySelector('.mf-page-title')?.textContent).toContain('Extrato Bancário');
    expect(texto(el())).toContain('Lançamento');
    expect(texto(el())).toContain('Importar extrato');
    expect(el().querySelector('[aria-label="Mais ações"]')).not.toBeNull();
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
    const cards = Array.from(el().querySelectorAll('mf-stat-card')).map(texto);

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

    it('Descartar volta o rascunho; sair com alterações pede confirmação (cancelar mantém)', async () => {
      const confirmacao = TestBed.inject(ConfirmacaoService);
      const pergunta = spyOn(confirmacao, 'confirmar').and.resolveTo(false);
      ligar();
      comp().rascunho[2].descricao = 'Salário de outubro';
      comp().aoEditar();
      await comp().alternarEdicao(false);
      expect(pergunta).toHaveBeenCalled();
      expect(comp().edicao).toBeTrue();

      comp().descartarEdicao();
      expect(comp().alteracoes).toBe(0);
      expect(comp().rascunho[2].descricao).toBe('Salário');
      await comp().alternarEdicao(false);
      expect(comp().edicao).toBeFalse();
      expect(pergunta).toHaveBeenCalledTimes(1);
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
      expect(comp().itensMenuMovel.map(i => i.label)[0]).toBe('Importar extrato');
      expect(el().textContent).not.toContain('Importar extrato');
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
