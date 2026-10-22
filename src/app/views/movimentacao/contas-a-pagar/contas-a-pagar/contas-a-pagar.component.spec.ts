import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Location } from '@angular/common';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { ConfirmationService } from 'primeng/api';
import { of, throwError } from 'rxjs';

import { ContasAPagarComponent } from './contas-a-pagar.component';
import { ContasAPagarModule } from '../contas-a-pagar.module';
import { LinhaContasMensais } from 'src/app/core/models/conta-mensal.model';
import { ContaMensalService } from 'src/app/core/services/conta-mensal.service';
import { CategoryService } from 'src/app/core/services/category.service';
import { AlertService } from 'src/app/shared/components/alert.service';
import { LarguraTelaService } from 'src/app/core/services/largura-tela.service';
import { signal } from '@angular/core';

/** Tela de Contas a Pagar: mês, resumo, modo edição, salvar e marcar como pago. */
describe('ContasAPagarComponent', () => {
  const conta = (parcial: Partial<LinhaContasMensais>): LinhaContasMensais => ({
    id: 1, contaId: 1, nome: 'Luz', valor: 100, data: '2026-10-20' as any, ehParcelado: false,
    categoriaId: 1, categoriaNome: 'Moradia', tipoContaId: '', subcategoriaNome: 'Despesa',
    situacao: 'PENDENTE', statusSalvo: 'PENDENTE', desbloqueiaCampos: false,
    ...parcial
  });

  let contas: LinhaContasMensais[];
  let fixture: ComponentFixture<ContasAPagarComponent>;
  let tela: ContasAPagarComponent;
  let service: jasmine.SpyObj<ContaMensalService>;
  let alert: jasmine.SpyObj<AlertService>;
  let confirmacao: ConfirmationService;
  /** Largura de celular, controlada pelo teste. */
  const movel = signal(false);

  beforeEach(() => {
    movel.set(false);
    jasmine.clock().install();
    jasmine.clock().mockDate(new Date(2026, 9, 17, 10, 0));
    localStorage.setItem('dataFiltroContaMensal', new Date(2026, 9, 1).toISOString());

    contas = [
      conta({ id: 1, valor: 200 }),
      conta({ id: 2, valor: 1500, data: '2026-10-05' as any }),
      conta({ id: 3, valor: 5000, subcategoriaNome: 'Receita', situacao: 'PAGO NO PRAZO' })
    ];

    service = jasmine.createSpyObj<ContaMensalService>('ContaMensalService', ['listarDoMes', 'atualizar', 'excluir', 'criar']);
    service.listarDoMes.and.callFake(() => of(contas));
    service.atualizar.and.returnValue(of({}));
    alert = jasmine.createSpyObj<AlertService>('AlertService', ['success', 'error', 'contrast']);
    const categorias = jasmine.createSpyObj<CategoryService>('CategoryService', ['listarAtivas']);
    categorias.listarAtivas.and.returnValue(of([]));

    TestBed.configureTestingModule({
      imports: [ContasAPagarModule],
      providers: [
        provideRouter([]),
        { provide: LarguraTelaService, useValue: { movel } },
        provideNoopAnimations(),
        { provide: ContaMensalService, useValue: service },
        { provide: CategoryService, useValue: categorias },
        { provide: AlertService, useValue: alert }
      ]
    });
    fixture = TestBed.createComponent(ContasAPagarComponent);
    tela = fixture.componentInstance;
    fixture.detectChanges();
    confirmacao = fixture.debugElement.injector.get(ConfirmationService);
  });

  afterEach(() => {
    jasmine.clock().uninstall();
    localStorage.removeItem('dataFiltroContaMensal');
  });

  it('desktop: breadcrumb e botão de voltar antes do título', () => {
    const el = fixture.nativeElement as HTMLElement;
    const location = TestBed.inject(Location);
    spyOn(location, 'back');

    expect(el.querySelector('p-breadcrumb')).not.toBeNull();
    el.querySelector<HTMLButtonElement>('.voltar button')!.click();
    expect(location.back).toHaveBeenCalled();
  });

  it('carrega o último mês escolhido e calcula o resumo', () => {
    expect(service.listarDoMes).toHaveBeenCalledWith('2026-10', false);
    expect(tela.resumo.receitas).toBe(5000);
    expect(tela.resumo.despesas).toBe(1700);
    expect(tela.resumo.vencidasQtd).toBe(1);
    expect(tela.nomeDoMes).toBe('outubro de 2026');
  });

  it('◀ ▶ trocam o mês, inclusive na virada de ano', () => {
    tela.mudarMes(1);
    expect(service.listarDoMes).toHaveBeenCalledWith('2026-11', false);

    tela.mudarMes(3);
    expect(service.listarDoMes).toHaveBeenCalledWith('2027-02', false);
  });

  it('modo edição bloqueia a navegação de mês', () => {
    tela.alternarEdicao(true);

    expect(tela.edicao).not.toBeNull();
    tela.mudarMes(1);
    expect(service.listarDoMes).not.toHaveBeenCalledWith('2026-11', false);
  });

  it('desligar sem alterações sai direto; com alterações pede confirmação', () => {
    spyOn(confirmacao, 'confirm').and.returnValue(confirmacao);

    tela.alternarEdicao(true);
    tela.alternarEdicao(false);
    expect(tela.edicao).toBeNull();
    expect(confirmacao.confirm).not.toHaveBeenCalled();

    tela.alternarEdicao(true);
    tela.edicao!.alterar(1, 'valor', 300);
    tela.alternarEdicao(false);
    expect(confirmacao.confirm).toHaveBeenCalled();
    expect(tela.edicao).not.toBeNull();
    expect(tela.switchEdicao).toBeTrue();
  });

  it('salvar envia cada conta alterada, sai da edição e recarrega', () => {
    tela.alternarEdicao(true);
    tela.edicao!.alterar(1, 'valor', 300);
    tela.edicao!.alterar(2, 'situacao', 'AGUARDANDO');
    service.listarDoMes.calls.reset();

    tela.salvar();

    expect(service.atualizar.calls.allArgs().map(([dto]) => [dto.id, dto.valor, dto.situacao])).toEqual([
      [1, 300, 'PENDENTE'],
      [2, 1500, 'AGUARDANDO']
    ]);
    expect(alert.success).toHaveBeenCalled();
    expect(tela.edicao).toBeNull();
    expect(service.listarDoMes).toHaveBeenCalled();
  });

  it('erro ao salvar mantém a edição', () => {
    service.atualizar.and.returnValue(throwError(() => new Error('falhou')));
    tela.alternarEdicao(true);
    tela.edicao!.alterar(1, 'valor', 300);

    tela.salvar();

    expect(alert.error).toHaveBeenCalled();
    expect(tela.edicao).not.toBeNull();
  });

  it('marcar como pago grava no prazo ou atrasado conforme o vencimento', () => {
    service.listarDoMes.calls.reset();

    tela.marcarComoPago([contas[0], contas[1]]);

    expect(service.atualizar.calls.allArgs().map(([dto]) => [dto.id, dto.situacao])).toEqual([
      [1, 'PAGO NO PRAZO'],
      [2, 'PAGO ATRASADO']
    ]);
    expect(alert.success).toHaveBeenCalledWith('2 contas marcadas como pagas.');
    expect(service.listarDoMes).toHaveBeenCalled();
  });

  it('marcar como pago não para na primeira falha e avisa o parcial', () => {
    service.atualizar.and.returnValues(throwError(() => new Error('falhou')), of({}));

    tela.marcarComoPago([contas[0], contas[1]]);

    expect(service.atualizar).toHaveBeenCalledTimes(2);
    expect(alert.contrast).toHaveBeenCalledWith('Pagamento parcial', jasmine.stringContaining('1 de 2 contas'));
  });

  describe('celular', () => {
    const el = () => fixture.nativeElement as HTMLElement;

    beforeEach(() => {
      movel.set(true);
      fixture.detectChanges();
    });

    it('troca a tabela pela lista de cards, o resumo compacto e o botão flutuante; sem modo edição', () => {
      expect(el().querySelector('app-lista-contas-movel')).not.toBeNull();
      expect(el().querySelector('app-tabela-contas')).toBeNull();
      expect(el().querySelector('app-resumo-mes .carrossel')).not.toBeNull();
      expect(el().querySelector('.fab-nova-conta')).not.toBeNull();
      expect(el().querySelector('p-inputSwitch')).toBeNull();
    });

    it('também tem breadcrumb e botão de voltar', () => {
      const location = TestBed.inject(Location);
      spyOn(location, 'back');

      expect(el().querySelector('p-breadcrumb')).not.toBeNull();
      el().querySelector<HTMLButtonElement>('.voltar button')!.click();
      expect(location.back).toHaveBeenCalled();
    });

    it('o ⋮ do título fica no canto direito (só título e botão na linha)', () => {
      const linha = el().querySelector('.titulo-movel')!;
      expect(Array.from(linha.children).map(c => c.tagName.toLowerCase())).toEqual(['div', 'p-button']);
    });

    it('editar abre o bottom sheet da conta', () => {
      tela.editar(contas[1]);
      expect(tela.contaEmEdicao).toBe(contas[1]);
      expect(tela.edicao).toBeNull();
    });

    it('salvar do sheet grava a conta, fecha e recarrega', () => {
      tela.editar(contas[0]);
      service.listarDoMes.calls.reset();

      tela.salvarConta({ ...contas[0], valor: 85 });

      expect(service.atualizar).toHaveBeenCalledWith(jasmine.objectContaining({ id: 1, valor: 85 }));
      expect(alert.success).toHaveBeenCalled();
      expect(tela.contaEmEdicao).toBeNull();
      expect(service.listarDoMes).toHaveBeenCalled();
    });

    it('erro ao salvar mantém o sheet aberto', () => {
      service.atualizar.and.returnValue(throwError(() => new Error('falhou')));
      tela.editar(contas[0]);

      tela.salvarConta({ ...contas[0], valor: 85 });

      expect(alert.error).toHaveBeenCalled();
      expect(tela.contaEmEdicao).toBe(contas[0]);
    });
  });
});
