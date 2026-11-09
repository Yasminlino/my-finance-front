import { TestBed } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { of } from 'rxjs';

import { ModalImportacoesMensaisComponent } from './modal-importacoes-mensais.component';
import { agruparPorMes, filtrarImportacoes, mesCurto, siglaDoBanco, tempoRelativo } from './importacoes.regras';
import { ImportacaoDto } from 'src/app/core/models/extrato.model';
import { ExtratoBancarioService } from 'src/app/core/services/extrato-bancario.service';
import { AlertService } from 'src/app/shared/components/alert.service';

const imp = (extra: Partial<ImportacaoDto> = {}): ImportacaoDto => ({
  id: 1, bancoId: 2, bancoNome: 'NuBank', nomeArquivo: 'nu.csv', importadoEm: '2026-10-30T18:39:00', mesReferencia: '2026-10',
  lancamentos: 39, duplicados: 3, semCategoria: 0, entradas: 100, saidas: 50, status: 'Concluida', ...extra
});

/** Importações realizadas (card #75). */
describe('ModalImportacoesMensaisComponent', () => {
  let servico: jasmine.SpyObj<ExtratoBancarioService>;

  const criar = () => {
    const f = TestBed.createComponent(ModalImportacoesMensaisComponent);
    f.detectChanges();
    return f;
  };
  const cobertura = {
    meses: ['2026-09', '2026-10'],
    contas: [{ bancoId: 2, bancoNome: 'NuBank', celulas: [
      { mes: '2026-09', estado: 'falta', lancamentos: 0, pendencias: 0 },
      { mes: '2026-10', estado: 'importado', lancamentos: 39, pendencias: 0 }
    ] }]
  };

  beforeEach(() => {
    servico = jasmine.createSpyObj<ExtratoBancarioService>('ExtratoBancarioService',
      ['listarImportacoes', 'coberturaImportacoes', 'vinculosImportacao', 'desfazerImportacao']);
    servico.listarImportacoes.and.returnValue(of([imp()]));
    servico.coberturaImportacoes.and.returnValue(of(cobertura));
    servico.vinculosImportacao.and.returnValue(of({ lancamentos: 39, divididos: 0, comNota: 0, pagamentosAbatendo: 1, pessoas: ['Carlos'] }));
    servico.desfazerImportacao.and.returnValue(of({}));
    TestBed.configureTestingModule({
      imports: [ModalImportacoesMensaisComponent],
      providers: [provideNoopAnimations(), { provide: ExtratoBancarioService, useValue: servico },
        { provide: AlertService, useValue: jasmine.createSpyObj('AlertService', ['success', 'error']) }]
    });
  });

  it('mostra o histórico dos últimos 3 meses e, sem mudança, fecha sem recarregar', () => {
    const f = criar();
    const fechou = jasmine.createSpy('closed');
    f.componentInstance.closed.subscribe(fechou);

    expect(servico.listarImportacoes).toHaveBeenCalledWith(3);
    expect(document.body.textContent).toContain('nu.csv');
    f.componentInstance.fechar();
    expect(fechou).toHaveBeenCalledWith(false);
    f.destroy();
  });

  it('desfazer confere os vínculos, grava o motivo e fecha recarregando', () => {
    const f = criar();
    const c = f.componentInstance;
    const fechou = jasmine.createSpy('closed');
    c.closed.subscribe(fechou);

    c.abrirDesfazer(imp());
    f.detectChanges();
    expect(document.body.textContent).toContain('acertos de Carlos');

    c.motivo = 'arquivo errado';
    c.confirmarDesfazer();
    expect(servico.desfazerImportacao).toHaveBeenCalledWith(1, 'arquivo errado');
    expect(c.desfazendo).toBeNull();
    expect(servico.listarImportacoes).toHaveBeenCalledTimes(2);

    c.fechar();
    expect(fechou).toHaveBeenCalledWith(true);
    f.destroy();
  });

  it('"falta" na cobertura abre o Importar com a conta', () => {
    const f = criar();
    const importar = jasmine.createSpy('importar');
    f.componentInstance.importar.subscribe(importar);
    f.componentInstance.aba = 1;
    f.detectChanges();

    (document.querySelector('.imp-celula.falta') as HTMLElement).click();

    expect(importar).toHaveBeenCalledWith(2);
    f.destroy();
  });

  it('o tooltip da cobertura explica cada estado', () => {
    const f = criar();
    const c = f.componentInstance;
    const celula = (estado: string, lancamentos = 0, pendencias = 0) => ({ mes: '2026-10', estado, lancamentos, pendencias });

    expect(c.dicaDaCelula('Caixa', celula('pendencias', 31, 26))).toBe('Caixa · out/2026: 31 lançamentos, 26 sem categoria.');
    expect(c.dicaDaCelula('Caixa', celula('importado', 1))).toContain('1 lançamento importados'.replace(' importados', ''));
    expect(c.dicaDaCelula('Caixa', celula('falta'))).toContain('não importado');
    expect(c.dicaDaCelula('Caixa', celula('sem-dados'))).toContain('sem importação esperada');
    f.destroy();
  });

  it('vazio diz o período', () => {
    servico.listarImportacoes.and.returnValue(of([]));
    const f = criar();
    expect(document.body.textContent).toContain('Nenhuma importação nos últimos 3 meses');
    f.destroy();
  });

  it('regras: sigla, mês, tempo, filtro e agrupamento', () => {
    expect(siglaDoBanco('NuBank')).toBe('Nu');
    expect(siglaDoBanco('Banco do Brasil')).toBe('BB');
    expect(mesCurto('2026-10')).toBe('out/2026');
    expect(tempoRelativo('2026-10-12T10:00:00', new Date(2026, 9, 30, 9))).toBe('há 18 dias');
    expect(tempoRelativo('2026-10-30T10:00:00', new Date(2026, 9, 30, 23))).toBe('hoje');

    const lista = [imp(), imp({ id: 2, bancoId: 3, bancoNome: 'Caixa', nomeArquivo: 'cx.pdf', mesReferencia: '2026-09' })];
    expect(filtrarImportacoes(lista, 'CX', null).map(i => i.id)).toEqual([2]);
    expect(filtrarImportacoes(lista, '', 2).map(i => i.id)).toEqual([1]);
    expect(agruparPorMes(lista).map(g => g.mes)).toEqual(['Outubro de 2026', 'Setembro de 2026']);
  });
});
