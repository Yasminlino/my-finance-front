import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { Dialog } from 'primeng/dialog';
import { of, throwError } from 'rxjs';

import { ModalAdicionarEmLoteComponent } from './modal-adicionar-em-lote.component';
import { ContaService } from 'src/app/core/services/contas.service';
import { CategoryService } from 'src/app/core/services/category.service';
import { ContaMensalService } from 'src/app/core/services/conta-mensal.service';
import { LarguraTelaService } from 'src/app/core/services/largura-tela.service';
import { AlertService } from 'src/app/shared/components/alert.service';
import { ContaDto } from 'src/app/core/models/conta.model';
import { CategoriaDto } from 'src/app/core/models/categoria.model';
import { TransacaoPayload } from 'src/app/core/models/conta-mensal.model';

/** "Adicionar contas em lote" no layout novo (card #48). */
describe('ModalAdicionarEmLoteComponent', () => {
  let fixture: ComponentFixture<ModalAdicionarEmLoteComponent>;
  let contas: jasmine.SpyObj<ContaService>;
  let mensais: jasmine.SpyObj<ContaMensalService>;
  let alertas: jasmine.SpyObj<AlertService>;
  const movel = signal(false);

  const categorias: CategoriaDto[] = [
    { id: 1, nome: 'Casa', subcategoria: 'Despesa', naturezaOperacao: 1, ativo: true },
    { id: 2, nome: 'Salário', subcategoria: 'Receita', naturezaOperacao: 2, ativo: true }
  ];

  const conta = (parcial: Partial<ContaDto> & { id: number; nome: string }): ContaDto => ({
    valor: 100, categoriaId: 1, categoriaNome: 'Casa', ativo: true, ehParcelado: false, parcelaAtual: 0,
    quantidadeParcelas: 0, vencimentos: [{ id: parcial.id, contaId: parcial.id, dia: 10, diasVencimentoString: '10' }],
    ...parcial
  });

  const cadastro = (): ContaDto[] => [
    conta({ id: 1, nome: 'Internet', valor: 120, valorFixo: true }),
    conta({ id: 2, nome: 'Luz', valor: 300 }),
    conta({ id: 3, nome: 'Salário', valor: 5000, categoriaId: 2, categoriaNome: 'Salário' }),
    conta({ id: 4, nome: 'Academia', ativo: false }),
    conta({ id: 5, nome: 'Feira', vencimentos: [] }),
    conta({ id: 6, nome: 'Água' })
  ];

  const comp = () => fixture.componentInstance;
  const el = () => fixture.nativeElement as HTMLElement;
  const texto = (e: Element | null | undefined) => (e?.textContent ?? '').replace(/\s+/g, ' ').trim();
  const nomesNaTabela = () => Array.from(el().querySelectorAll('.lote-principal .lote-nome')).map(texto);
  const botao = (rotulo: string) =>
    Array.from(document.querySelectorAll<HTMLButtonElement>('button')).find(b => texto(b).includes(rotulo));

  function criar() {
    fixture = TestBed.createComponent(ModalAdicionarEmLoteComponent);
    fixture.componentInstance.month = '2026-11';
    fixture.detectChanges();
  }

  beforeEach(() => {
    movel.set(false);
    contas = jasmine.createSpyObj<ContaService>('ContaService', ['listar']);
    contas.listar.and.returnValue(of(cadastro()));
    mensais = jasmine.createSpyObj<ContaMensalService>('ContaMensalService', ['listarDoMes', 'criar']);
    // Água já lançada no mês.
    mensais.listarDoMes.and.returnValue(of([{ contaId: 6 } as never]));
    let proximoId = 900;
    mensais.criar.and.callFake(() => of([{ id: proximoId++ }]));
    alertas = jasmine.createSpyObj('AlertService', ['success', 'error']);
    const categoriasService = jasmine.createSpyObj<CategoryService>('CategoryService', ['listar']);
    categoriasService.listar.and.returnValue(of(categorias));

    TestBed.configureTestingModule({
      imports: [ModalAdicionarEmLoteComponent],
      providers: [
        provideNoopAnimations(),
        { provide: ContaService, useValue: contas },
        { provide: CategoryService, useValue: categoriasService },
        { provide: ContaMensalService, useValue: mensais },
        { provide: AlertService, useValue: alertas },
        { provide: LarguraTelaService, useValue: { movel } }
      ]
    });
    criar();
  });

  it('título com o mês; o X fecha sem recarregar', () => {
    const fechado = jasmine.createSpy('closed');
    comp().closed.subscribe(fechado);
    const dialogo = fixture.debugElement.query(By.directive(Dialog));

    expect(dialogo.componentInstance.header).toBe('Adicionar contas de novembro/2026');
    dialogo.componentInstance.close(new Event('click'));
    expect(fechado).toHaveBeenCalledOnceWith(false);
  });

  it('Disponíveis lista as que dá para lançar, em ordem alfabética; lançadas e inativas num grupo recolhido', () => {
    expect(nomesNaTabela()).toEqual(['Feira', 'Internet', 'Luz', 'Salário']);
    const grupo = el().querySelector('.lote-grupo-desabilitadas');
    expect(texto(grupo)).toContain('Já lançadas e inativas (2)');
    expect(el().querySelectorAll('.lote-desabilitadas .lote-nome').length).toBe(0);

    (grupo as HTMLElement).click();
    fixture.detectChanges();

    expect(Array.from(el().querySelectorAll('.lote-desabilitadas .lote-nome')).map(texto)).toEqual(['Academia', 'Água']);
  });

  it('contador em cada filtro; Já lançadas mostra só elas', () => {
    expect(comp().opcoesFiltro.map(o => [o.value, o.contagem])).toEqual([['disponiveis', 4], ['lancadas', 1], ['todas', 6]]);

    comp().filtro = 'lancadas';
    comp().aoMudarFiltro();
    fixture.detectChanges();

    expect(nomesNaTabela()).toEqual(['Água']);
  });

  it('Selecionar todas válidas pega só as disponíveis; rodapé com quantidade e totais', () => {
    botao('Selecionar todas válidas')!.click();
    fixture.detectChanges();

    expect([...comp().selecionadas]).toEqual([1, 2, 3]); // Feira, sem dia, fica de fora
    expect(botao('Adicionar 3 contas')).toBeTruthy();
    const rodape = texto(el().querySelector('.lote-totais'));
    expect(rodape).toContain('Receitas R$ 5.000,00');
    expect(rodape).toContain('Despesas R$ 420,00');
  });

  it('conta sem dia pede o dia; informado, a linha fica válida e entra na seleção', () => {
    const feira = comp().linhas.find(l => l.conta.nome === 'Feira')!;
    expect(texto(el().querySelector('.lote-principal'))).toContain('Informe o dia');

    comp().informarDias(feira, '15');
    fixture.detectChanges();

    expect(feira.situacao).toBe('disponivel');
    expect(comp().selecionadas.has(5)).toBeTrue();
  });

  it('valor zerado tira da seleção', () => {
    const luz = comp().linhas.find(l => l.conta.nome === 'Luz')!;
    comp().alternar(luz);

    comp().informarValor(luz, 0);

    expect(luz.situacao).toBe('invalida');
    expect(comp().selecionadas.has(2)).toBeFalse();
  });

  it('Adicionar grava uma por vez, com os ajustes só do mês, e devolve os ids criados', () => {
    const adicionadas = jasmine.createSpy('adicionadas');
    const fechado = jasmine.createSpy('closed');
    comp().adicionadas.subscribe(adicionadas);
    comp().closed.subscribe(fechado);
    const internet = comp().linhas.find(l => l.conta.nome === 'Internet')!;
    const luz = comp().linhas.find(l => l.conta.nome === 'Luz')!;
    comp().alternar(internet);
    comp().alternar(luz);
    comp().informarValor(luz, 287.4);

    comp().adicionar();

    const enviados = mensais.criar.calls.allArgs().map(([p]) => p as TransacaoPayload);
    expect(enviados.map(p => [p.nome, p.situacao, p.valorDoMes])).toEqual([
      ['Internet', 'AGUARDANDO', undefined],
      ['Luz', 'PENDENTE', 287.4]
    ]);
    expect(adicionadas).toHaveBeenCalledOnceWith({ contas: 2, ids: [900, 901] });
    expect(fechado).toHaveBeenCalledOnceWith(true);
  });

  it('falha em uma: avisa o nome, devolve as que deram certo e continua aberta com a que falhou', () => {
    const adicionadas = jasmine.createSpy('adicionadas');
    const fechado = jasmine.createSpy('closed');
    comp().adicionadas.subscribe(adicionadas);
    comp().closed.subscribe(fechado);
    mensais.criar.and.callFake((p: TransacaoPayload) =>
      p.nome === 'Luz' ? throwError(() => new Error('falhou')) : of([{ id: 950 }]));
    comp().alternar(comp().linhas.find(l => l.conta.nome === 'Internet')!);
    comp().alternar(comp().linhas.find(l => l.conta.nome === 'Luz')!);

    comp().adicionar();

    expect(adicionadas).toHaveBeenCalledOnceWith({ contas: 1, ids: [950] });
    expect(fechado).not.toHaveBeenCalled();
    expect(alertas.error).toHaveBeenCalledWith(jasmine.stringContaining('Luz'));
    expect(comp().selecionadas.has(2)).toBeTrue();
  });

  it('sem seleção o Adicionar fica desabilitado', () => {
    expect(botao('Adicionar')?.disabled).toBeTrue();
  });

  describe('celular', () => {
    beforeEach(() => {
      movel.set(true);
      criar();
    });

    const card = (nome: string) => Array.from(el().querySelectorAll<HTMLElement>('.lote-principal .lote-card'))
      .find(c => texto(c.querySelector('.lote-nome')) === nome)!;

    it('tela cheia com cards, sem tabela; tocar no card escolhe', () => {
      expect(el().querySelector('.lote-dialog-movel')).not.toBeNull();
      expect(el().querySelector('p-table')).toBeNull();

      card('Luz').click();
      fixture.detectChanges();

      expect(comp().selecionadas.has(2)).toBeTrue();
      expect(card('Luz').classList).toContain('lote-selecionada');
      expect(botao('Adicionar 1 conta')).toBeTruthy();
    });

    it('a inválida abre o ajuste; com valor e dia aplicados, entra na seleção', () => {
      card('Feira').click();
      fixture.detectChanges();
      expect(comp().emAjuste?.conta.nome).toBe('Feira');

      comp().valorEmAjuste = 64.9;
      comp().diasEmAjuste = '15';
      comp().aplicarAjuste();
      fixture.detectChanges();

      const feira = comp().linhas.find(l => l.conta.nome === 'Feira')!;
      expect(comp().emAjuste).toBeNull();
      expect([feira.valor, feira.dias, feira.situacao]).toEqual([64.9, [15], 'disponivel']);
      expect(comp().selecionadas.has(5)).toBeTrue();
    });
  });
});
