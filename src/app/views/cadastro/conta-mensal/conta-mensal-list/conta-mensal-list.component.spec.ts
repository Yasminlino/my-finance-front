import { signal } from '@angular/core';
import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { ConfirmationService, MessageService } from 'primeng/api';
import { of, throwError } from 'rxjs';
import { ContaService } from 'src/app/core/services/contas.service';
import { CategoryService } from 'src/app/core/services/category.service';
import { ConfirmacaoService } from 'src/app/core/services/confirmacao.service';
import { LarguraTelaService } from 'src/app/core/services/largura-tela.service';
import { AlertService } from 'src/app/shared/components/alert.service';
import { ContaDto } from 'src/app/core/models/conta.model';
import { CategoriaDto } from 'src/app/core/models/categoria.model';

import { CadastroContaMensalModule } from '../conta-mensal.module';
import { ContaMensalListComponent } from './conta-mensal-list.component';

/** Lista do Cadastro de Contas no layout novo (card #22). */
describe('ContaMensalListComponent', () => {
  let fixture: ComponentFixture<ContaMensalListComponent>;
  let contas: jasmine.SpyObj<ContaService>;
  let confirmacao: jasmine.SpyObj<ConfirmacaoService>;
  let alerta: jasmine.SpyObj<AlertService>;
  const movel = signal(false);

  const venc = (contaId: number, ...dias: number[]) => dias.map((dia, i) => ({ id: i, contaId, dia, diasVencimentoString: '' }));
  const categorias = (): CategoriaDto[] => [
    { id: 1, nome: 'Casa', subcategoria: 'Despesa', naturezaOperacao: 1, ativo: true, icone: 'pi pi-home', cor: 'laranja' },
    { id: 2, nome: 'Contas Fixas', subcategoria: 'Despesa', naturezaOperacao: 1, ativo: true }
  ];
  const dados = (): ContaDto[] => [
    { id: 10, nome: 'Internet', valor: 120, categoriaId: 2, categoriaNome: 'Contas Fixas', ativo: true, ehParcelado: false,
      parcelaAtual: 0, quantidadeParcelas: 0, vencimentos: venc(10, 10) },
    { id: 11, nome: 'Sofá', valor: 300, categoriaId: 1, categoriaNome: 'Casa', ativo: true, ehParcelado: true,
      parcelaAtual: 3, quantidadeParcelas: 10, vencimentos: venc(11, 20, 5) },
    { id: 12, nome: 'Cartão Caixa ', valor: 50, categoriaId: 2, categoriaNome: 'Contas Fixas', ativo: true, ehParcelado: false,
      parcelaAtual: 0, quantidadeParcelas: 0, vencimentos: venc(12, 15) },
    { id: 13, nome: 'Cartão caixa', valor: 40, categoriaId: 2, categoriaNome: 'Contas Fixas', ativo: true, ehParcelado: false,
      parcelaAtual: 0, quantidadeParcelas: 0, vencimentos: [] },
    { id: 14, nome: 'Academia', valor: 99.9, categoriaId: 1, categoriaNome: 'Casa', ativo: false, ehParcelado: false,
      parcelaAtual: 0, quantidadeParcelas: 0, vencimentos: venc(14, 1) }
  ];

  const comp = () => fixture.componentInstance;
  const el = () => fixture.nativeElement as HTMLElement;
  const texto = (e: Element | null) => (e?.textContent ?? '').replace(/\s+/g, ' ');
  const linhas = () => Array.from(el().querySelectorAll('.tabela-contas tbody tr'));
  const linhaDe = (nome: string) => linhas().find(l => l.textContent?.includes(nome))!;
  /** O p-menu vai para o body; popups de testes anteriores ficam lá, então vale só o último aberto. */
  const menuAberto = () => Array.from(document.querySelectorAll('.p-menu')).pop()!;

  beforeEach(() => {
    movel.set(false);
    contas = jasmine.createSpyObj<ContaService>('ContaService', ['listar', 'atualizar', 'excluir', 'criar', 'listarLancamentos']);
    contas.listar.and.returnValue(of(dados()));
    contas.atualizar.and.returnValue(of({}));
    contas.excluir.and.returnValue(of({}));
    const categoriasService = jasmine.createSpyObj<CategoryService>('CategoryService', ['listar']);
    categoriasService.listar.and.returnValue(of(categorias()));
    confirmacao = jasmine.createSpyObj<ConfirmacaoService>('ConfirmacaoService', ['confirmar']);
    confirmacao.confirmar.and.resolveTo(true);
    alerta = jasmine.createSpyObj<AlertService>('AlertService', ['success', 'error', 'info']);

    TestBed.configureTestingModule({
      imports: [CadastroContaMensalModule],
      providers: [
        provideRouter([]), provideNoopAnimations(), ConfirmationService, MessageService,
        { provide: ContaService, useValue: contas },
        { provide: CategoryService, useValue: categoriasService },
        { provide: ConfirmacaoService, useValue: confirmacao },
        { provide: AlertService, useValue: alerta },
        { provide: LarguraTelaService, useValue: { movel } }
      ]
    });
    fixture = TestBed.createComponent(ContaMensalListComponent);
    fixture.detectChanges();
  });

  it('cabeçalho com título, subtítulo, Exportar e Nova conta', () => {
    expect(el().querySelector('.mf-page-title')?.textContent).toContain('Contas');
    expect(el().textContent).toContain('Contas recorrentes que geram os lançamentos de cada mês em Contas a Pagar');
    expect(el().textContent).toContain('Exportar');
    expect(el().textContent).toContain('Nova conta');
  });

  it('4 cards de resumo: ativas, total mensal, parceladas em andamento e inativas', () => {
    const cards = Array.from(el().querySelectorAll('mf-stat-card')).map(texto);
    expect(cards.length).toBe(4);
    expect(cards[0]).toContain('4');
    // Sem conta de receita nos dados: saldo = 0 − 510.
    expect(cards[1]).toContain('Saldo previsto');
    expect(cards[1]).toContain('− R$ 510,00');
    expect(cards[1]).toContain('Receitas R$ 0,00 · Despesas R$ 510,00');
    expect(cards[2]).toContain('1');
    expect(cards[3]).toContain('1');
  });

  it('por padrão só as ativas, pelo primeiro dia de vencimento; a sem dia vai para o fim', () => {
    expect(linhas().map(l => l.querySelector('.conta-nome')?.textContent?.trim()))
      .toEqual(['Sofá', 'Internet', 'Cartão Caixa', 'Cartão caixa']);
  });

  it('as opções da situação não mudam de referência sem mudar o filtro (o clique na aba não se perde)', () => {
    const opcoes = comp().opcoesSituacao;
    fixture.detectChanges();
    expect(comp().opcoesSituacao).toBe(opcoes);
    expect(opcoes.map(o => o.contagem)).toEqual([4, 1, 5]);
  });

  it('situação Inativas e Todas', () => {
    comp().situacao = 'inativas';
    comp().aoMudarFiltro();
    fixture.detectChanges();
    expect(linhas().length).toBe(1);
    expect(linhaDe('Academia').classList).toContain('mf-row-inativa');

    comp().situacao = 'todas';
    comp().aoMudarFiltro();
    fixture.detectChanges();
    expect(linhas().length).toBe(5);
  });

  it('filtra por categoria e pela busca; ordena pelo maior valor', () => {
    comp().categoriasSelecionadas = [1];
    comp().aoMudarFiltro();
    fixture.detectChanges();
    expect(linhas().length).toBe(1);

    comp().limparFiltros();
    comp().busca = 'INTER';
    comp().aoMudarFiltro();
    fixture.detectChanges();
    expect(linhas().length).toBe(1);

    comp().limparFiltros();
    comp().ordem = 'valor';
    comp().aoMudarFiltro();
    fixture.detectChanges();
    expect(linhas()[0].textContent).toContain('Sofá');
  });

  it('linha: ícone e cor da categoria, categoria embaixo, vencimento em texto, parcelas com barra', () => {
    const sofa = linhaDe('Sofá');
    expect(sofa.querySelector('.mf-icone-categoria')!.classList).toContain('mf-cor-laranja');
    expect(texto(sofa)).toContain('Casa');
    expect(texto(sofa)).toContain('Dias 5 e 20');
    expect(texto(sofa)).toContain('3 / 10');
    expect(sofa.querySelector('p-progressbar')).not.toBeNull();
    expect(texto(linhaDe('Internet'))).toContain('Todo dia 10');
    expect(texto(linhaDe('Internet'))).toContain('—');
  });

  it('avisos: nome parecido e sem dia de vencimento', () => {
    expect(linhaDe('Cartão Caixa').querySelector('.aviso-parecido')).not.toBeNull();
    expect(linhaDe('Cartão caixa').querySelector('.aviso-sem-vencimento')).not.toBeNull();
    expect(linhaDe('Internet').querySelector('.aviso-parecido, .aviso-sem-vencimento')).toBeNull();
  });

  describe('ativar e inativar pela lista', () => {
    it('grava na hora com os dias da conta e avisa', fakeAsync(() => {
      comp().alternarAtivo(comp().registros.find(c => c.id === 11)!, false);
      tick();

      expect(contas.atualizar).toHaveBeenCalledWith(jasmine.objectContaining({ id: 11, ativo: false, dataOperacao: [5, 20] }));
      expect(alerta.success).toHaveBeenCalled();
      expect(comp().resumo.ativas).toBe(3);
    }));

    it('erro na gravação volta o switch e avisa', fakeAsync(() => {
      contas.atualizar.and.returnValue(throwError(() => new Error('falhou')));

      comp().alternarAtivo(comp().registros.find(c => c.id === 13)!, false);
      tick();

      expect(comp().registros.find(c => c.id === 13)!.ativo).toBeTrue();
      expect(alerta.error).toHaveBeenCalled();
    }));
  });

  it('Duplicar abre o formulário com a cópia como conta nova', () => {
    comp().duplicar(comp().registros.find(c => c.id === 11)!);

    expect(comp().showModalForm).toBeTrue();
    expect(comp().editing?.id).toBe(0);
    expect(comp().editing?.nome).toBe('Sofá (cópia)');
    expect(comp().editing?.parcelaAtual).toBe(1);
  });

  it('pelo menu ⋮ da linha: "Excluir" confirma e exclui', fakeAsync(() => {
    (linhaDe('Internet').querySelector('[aria-label="Mais ações de Internet"]') as HTMLElement).click();
    fixture.detectChanges();
    tick();
    const item = Array.from(menuAberto().querySelectorAll('.p-menuitem-content'))
      .find(e => e.textContent?.includes('Excluir')) as HTMLElement;
    item.click();
    tick();

    expect(confirmacao.confirmar).toHaveBeenCalled();
    expect(contas.excluir).toHaveBeenCalledWith(10);
  }));

  it('pelo menu ⋮ da linha: "Ver lançamentos" abre o painel da conta; "Editar conta" troca para a edição', fakeAsync(() => {
    contas.listarLancamentos.and.returnValue(of([]));
    (linhaDe('Sofá').querySelector('[aria-label="Mais ações de Sofá"]') as HTMLElement).click();
    fixture.detectChanges();
    tick();
    const rotulos = Array.from(menuAberto().querySelectorAll('.p-menuitem')).map(i => i.textContent?.trim());
    expect(rotulos).toEqual(['Ver lançamentos', 'Excluir']);

    const item = Array.from(menuAberto().querySelectorAll('.p-menuitem-content'))
      .find(e => e.textContent?.includes('Ver lançamentos')) as HTMLElement;
    item.click();
    fixture.detectChanges();
    tick();

    expect(comp().contaDosLancamentos?.id).toBe(11);
    expect(contas.listarLancamentos).toHaveBeenCalledWith(11);

    comp().editarDosLancamentos();
    expect(comp().contaDosLancamentos).toBeNull();
    expect(comp().showModalForm).toBeTrue();
    expect(comp().editing?.id).toBe(11);
  }));

  it('Exportar gera o CSV da tabela', () => {
    const exportar = spyOn(comp().tabela!, 'exportCSV');

    comp().exportar();

    expect(exportar).toHaveBeenCalled();
  });

  describe('celular', () => {
    const cards = () => Array.from(el().querySelectorAll('.mf-list-card'));

    beforeEach(() => {
      movel.set(true);
      fixture.detectChanges();
    });

    it('cards no lugar da tabela, 3 mini-cards de resumo e o botão flutuante', () => {
      expect(el().querySelector('.tabela-contas')).toBeNull();
      expect(cards().length).toBe(4);
      expect(el().querySelectorAll('.resumo-movel-item').length).toBe(3);
      expect(el().querySelectorAll('.resumo-movel-item i.pi').length).toBe(3);
      // O saldo vem primeiro, na largura toda, com receitas e despesas embaixo.
      const saldo = texto(el().querySelectorAll('.resumo-movel-item')[0]);
      expect(saldo).toContain('Saldo previsto/mês');
      expect(saldo).toContain('− R$ 510,00');
      expect(saldo).toContain('Receitas R$ 0,00 · Despesas R$ 510,00');
      expect(el().querySelector('mf-fab')).not.toBeNull();
      expect(el().textContent).not.toContain('Nova conta');
    });

    it('tocar no card abre a edição; o switch e o ⋮ do card não', () => {
      const sofa = cards().find(c => c.textContent?.includes('Sofá')) as HTMLElement;
      (sofa.querySelector('.card-ativo') as HTMLElement).click();
      (sofa.querySelector('[aria-label="Mais ações de Sofá"]') as HTMLElement).click();
      expect(comp().showModalForm).toBeFalse();

      sofa.click();
      expect(comp().showModalForm).toBeTrue();
      expect(comp().editing?.id).toBe(11);
    });

    it('categorias e Ordenar por ficam no painel de baixo; a situação fica na barra', () => {
      expect(el().querySelector('.mf-filter-bar__inicio p-selectbutton')).not.toBeNull();
      expect(el().querySelector('.mf-filter-bar__fim [aria-label="Mais filtros"]')).not.toBeNull();

      comp().filtrosMovelAbertos = true;
      fixture.detectChanges();
      const painel = document.querySelector('.filtros-movel');
      expect(painel?.textContent).toContain('Categorias');
      expect(painel?.textContent).toContain('Ordenar por');
    });
  });
});
