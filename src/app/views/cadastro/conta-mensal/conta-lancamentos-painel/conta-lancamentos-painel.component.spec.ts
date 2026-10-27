import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { of, throwError } from 'rxjs';
import { ContaService } from 'src/app/core/services/contas.service';
import { LarguraTelaService } from 'src/app/core/services/largura-tela.service';
import { ContaDto, LancamentoDaConta } from 'src/app/core/models/conta.model';

import { ContaLancamentosPainelComponent } from './conta-lancamentos-painel.component';

/** Painel de lançamentos da conta, aberto pelo ⋮ "Ver lançamentos" (card #22). */
describe('ContaLancamentosPainelComponent', () => {
  let fixture: ComponentFixture<ContaLancamentosPainelComponent>;
  let service: jasmine.SpyObj<ContaService>;
  const conta: ContaDto = {
    id: 38, nome: 'Cabelo', valor: 250, categoriaId: 1, categoriaNome: 'Carlos', ativo: true, ehParcelado: false,
    parcelaAtual: 0, quantidadeParcelas: 0, vencimentos: [{ id: 1, contaId: 38, dia: 5, diasVencimentoString: '' }]
  };
  const lancamentos: LancamentoDaConta[] = [
    { id: 1, data: '2026-10-05', nome: 'Cabelo', valor: 250, situacao: 'PAGO NO PRAZO', ehParcelado: false }
  ];

  const el = () => document.querySelector('.mf-lancamentos-painel') as HTMLElement;
  const abrir = () => {
    fixture = TestBed.createComponent(ContaLancamentosPainelComponent);
    fixture.componentRef.setInput('conta', conta);
    fixture.componentRef.setInput('aparencia', { natureza: 2, icone: 'pi pi-wallet', cor: null });
    fixture.detectChanges();
  };

  beforeEach(() => {
    service = jasmine.createSpyObj<ContaService>('ContaService', ['listarLancamentos']);
    service.listarLancamentos.and.returnValue(of(lancamentos));
    TestBed.configureTestingModule({
      imports: [ContaLancamentosPainelComponent],
      providers: [
        provideNoopAnimations(),
        { provide: ContaService, useValue: service },
        { provide: LarguraTelaService, useValue: { movel: signal(false) } }
      ]
    });
  });

  it('busca os lançamentos da conta ao abrir e mostra nome, categoria e vencimento', () => {
    abrir();

    expect(service.listarLancamentos).toHaveBeenCalledOnceWith(38);
    expect(el().textContent).toContain('Cabelo');
    expect(el().textContent).toContain('Carlos · Todo dia 5');
  });

  it('com lançamentos: card Acompanhamento e a lista', () => {
    abrir();

    expect(el().querySelector('app-conta-acompanhamento')).not.toBeNull();
    expect(el().querySelector('app-conta-lancamentos')).not.toBeNull();
  });

  it('sem lançamentos, não desenha o gráfico', () => {
    service.listarLancamentos.and.returnValue(of([]));
    abrir();

    expect(el().querySelector('app-conta-acompanhamento')).toBeNull();
    expect(el().textContent).toContain('ainda não gerou lançamentos');
  });

  it('erro na busca avisa na lista', () => {
    service.listarLancamentos.and.returnValue(throwError(() => new Error('falhou')));
    abrir();

    expect(fixture.componentInstance.erro).toBeTrue();
    expect(el().textContent).toContain('Não foi possível carregar os lançamentos');
  });

  describe('período', () => {
    const varios: LancamentoDaConta[] = [
      { id: 3, data: '2026-10-05', nome: 'Cabelo', valor: 250, situacao: 'PAGO NO PRAZO', ehParcelado: false },
      { id: 2, data: '2026-06-05', nome: 'Cabelo', valor: 250, situacao: 'PAGO NO PRAZO', ehParcelado: false },
      { id: 1, data: '2025-01-05', nome: 'Cabelo', valor: 25000, situacao: 'PAGO NO PRAZO', ehParcelado: false }
    ];

    beforeEach(() => service.listarLancamentos.and.returnValue(of(varios)));

    it('abre nos 12 meses até o mais recente: o que é mais antigo fica de fora do resumo e da lista', () => {
      abrir();
      const c = fixture.componentInstance;

      expect(c.periodo).toEqual({ de: { ano: 2025, mes: 11 }, ate: { ano: 2026, mes: 10 } });
      expect(c.lancamentosDoPeriodo.map(l => l.id)).toEqual([3, 2]);
      // Intl pt-BR separa "R$" do número com espaço não separável.
      expect(el().textContent!.replace(/\s+/g, ' ')).toContain('R$ 500,00 pago');
    });

    it('mudar De e Até refiltra resumo, gráfico e lista', () => {
      abrir();
      const c = fixture.componentInstance;

      c.intervalo = [new Date(2025, 0, 1), new Date(2026, 5, 1)];
      c.aoMudarPeriodo();
      fixture.detectChanges();

      expect(c.periodo).toEqual({ de: { ano: 2025, mes: 1 }, ate: { ano: 2026, mes: 6 } });
      expect(c.lancamentosDoPeriodo.map(l => l.id)).toEqual([2, 1]);
      expect(el().textContent!.replace(/\s+/g, ' ')).toContain('R$ 25.250,00 pago');
    });

    it('só o mês inicial escolhido (fechou o calendário no meio) vira um período de um mês', () => {
      abrir();
      const c = fixture.componentInstance;

      c.intervalo = [new Date(2026, 5, 1), null];
      c.aoMudarPeriodo();

      expect(c.periodo).toEqual({ de: { ano: 2026, mes: 6 }, ate: { ano: 2026, mes: 6 } });
      expect(c.intervalo).toEqual([new Date(2026, 5, 1), new Date(2026, 5, 1)]);
    });

    it('um campo só de período, no topo do painel, já com o intervalo padrão', () => {
      abrir();
      const c = fixture.componentInstance;

      expect(el().querySelector('#periodo')).not.toBeNull();
      expect(el().querySelector('#periodo-de, #periodo-ate')).toBeNull();
      expect(c.intervalo).toEqual([new Date(2025, 10, 1), new Date(2026, 9, 1)]);
    });
  });

  it('"Editar conta" e "Fechar" avisam a lista', () => {
    abrir();
    const editar = jasmine.createSpy('editar');
    const fechar = jasmine.createSpy('fechar');
    fixture.componentInstance.editar.subscribe(editar);
    fixture.componentInstance.fechar.subscribe(fechar);
    const botao = (rotulo: string) => Array.from(el().querySelectorAll('button')).find(b => b.textContent?.includes(rotulo)) as HTMLElement;

    botao('Editar conta').click();
    botao('Fechar').click();

    expect(editar).toHaveBeenCalled();
    expect(fechar).toHaveBeenCalled();
  });
});
