import { ChangeDetectorRef } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';

import { DataGridComponent } from './data-grid.component';
import { GridColumn, GridColumnOption } from './data-grid.interface';
import { TagStatus } from '../../enums/status.enum';

describe('DataGridComponent', () => {
  let fixture: ComponentFixture<DataGridComponent>;
  let grid: DataGridComponent;

  const statusOptions: GridColumnOption[] = [
    { label: 'PENDENTE', value: 'PENDENTE', classe: TagStatus.Danger },
    { label: 'PAGO NO PRAZO', value: 'PAGO NO PRAZO', classe: TagStatus.Success }
  ];

  const colunas: GridColumn[] = [
    { field: 'nome', header: 'Nome' },
    { field: 'vencimento', header: 'Vencimento', type: 'date' },
    { field: 'categoriaId', header: 'Categoria', type: 'select', options: [{ label: 'Casa', value: 6 }] },
    { field: 'valor', header: 'Valor', type: 'money', formatter: r => `R$ ${r.valor}` },
    { field: 'status', header: 'Status', type: 'select', options: statusOptions }
  ];

  const linha = (extra: Record<string, unknown> = {}) =>
    ({ id: 1, nome: 'Luz', vencimento: '2026-10-05', categoriaId: 6, valor: 10, status: 'PENDENTE', ...extra });

  const entradas = (valores: Record<string, unknown>) => {
    Object.entries(valores).forEach(([nome, valor]) => fixture.componentRef.setInput(nome, valor));
    fixture.detectChanges();
  };

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideNoopAnimations()] });
    fixture = TestBed.createComponent(DataGridComponent);
    grid = fixture.componentInstance;
  });

  describe('montagem das linhas (FE-P2-06)', () => {
    it('converte as datas mesmo quando as colunas chegam depois dos dados', () => {
      entradas({ dataSource: [linha()] });
      entradas({ columns: colunas });

      const data = grid.tableRows[0].vencimento;
      expect(data instanceof Date).toBeTrue();
      expect(data.getFullYear()).toBe(2026);
      expect(data.getMonth()).toBe(9);
      expect(data.getDate()).toBe(5);
    });

    it('não altera os objetos recebidos da tela', () => {
      const original = linha();
      entradas({ columns: colunas, dataSource: [original] });

      expect(original.vencimento).toBe('2026-10-05');
      expect((original as any).__dg).toBeUndefined();
    });

    it('pré-calcula o texto da célula: formatter, rótulo do select ou o valor', () => {
      entradas({ columns: colunas, statusOptions, dataSource: [linha()] });

      const meta = grid.tableRows[0].__dg;
      expect(meta.texto['valor']).toBe('R$ 10');
      expect(meta.texto['categoriaId']).toBe('Casa');
      expect(meta.texto['nome']).toBe('Luz');
      expect(grid.tableRows[0].__dg_valor).toBe('R$ 10');
    });

    it('pré-calcula a severidade da tag de status', () => {
      entradas({ columns: colunas, statusOptions, dataSource: [linha({ status: 'PAGO NO PRAZO' })] });

      expect(grid.tableRows[0].__dg.severidade).toBe(TagStatus.Success);
    });

    it('recalcula quando o statusOptions chega depois', () => {
      entradas({ columns: colunas, dataSource: [linha({ status: 'PAGO NO PRAZO' })] });
      expect(grid.tableRows[0].__dg.severidade).toBe(TagStatus.Info);

      entradas({ statusOptions });
      expect(grid.tableRows[0].__dg.severidade).toBe(TagStatus.Success);
    });

    it('marca como desabilitada a linha somente leitura ou listada em disabledRowIds', () => {
      entradas({
        columns: colunas,
        disabledRowIds: new Set([2]),
        dataSource: [linha(), linha({ id: 2 }), linha({ id: 3, somenteLeitura: true })]
      });

      expect(grid.tableRows.map(r => r.__dg.desabilitada)).toEqual([false, true, true]);
    });

    it('refaz o texto da linha alterada na edição inline', () => {
      entradas({ columns: colunas, dataSource: [linha()] });
      grid.toggleEdicaoTabela();
      const row = grid.tableRows[0];

      row.valor = 25;
      grid.onCellChange(row);

      expect(row.__dg.texto['valor']).toBe('R$ 25');
    });
  });

  describe('bloqueio de linha (FE-P2-04)', () => {
    const paga = (r: any) => r.status === 'PAGO NO PRAZO';

    it('a linha bloqueada pela tela não entra no modo de edição', () => {
      entradas({
        columns: colunas,
        bloquearLinha: paga,
        dataSource: [linha(), linha({ id: 2, status: 'PAGO NO PRAZO' })]
      });

      grid.toggleEdicaoTabela();

      expect(grid.tableRows.map(r => r.__dg.bloqueada)).toEqual([false, true]);
      expect(grid.originalRows.has(1)).toBeTrue();
      expect(grid.originalRows.has(2)).toBeFalse();
    });

    it('sem predicado nenhuma linha é bloqueada, nem com status "PAGO"', () => {
      entradas({ columns: colunas, dataSource: [linha({ status: 'PAGO' }), linha({ id: 2, bloqueado: true })] });

      grid.toggleEdicaoTabela();

      expect(grid.originalRows.size).toBe(2);
    });
  });

  describe('exclusão em lote (FE-P2-05)', () => {
    beforeEach(() => entradas({ columns: colunas, dataSource: [linha(), linha({ id: 2 })] }));

    it('emite as linhas selecionadas e liga o carregamento do botão', () => {
      const emitido = jasmine.createSpy('deleteSelected');
      grid.deleteSelected.subscribe(emitido);
      grid.selectedItems = [grid.tableRows[0]];

      grid.onDeleteSelected();

      expect(emitido).toHaveBeenCalledOnceWith([grid.tableRows[0]]);
      expect(grid.deleting).toBeTrue();
    });

    it('concluirExclusao(true) libera o botão e limpa a seleção', () => {
      const selecao = jasmine.createSpy('selectionChange');
      grid.selectionChange.subscribe(selecao);
      grid.selectedItems = [grid.tableRows[0]];
      grid.onDeleteSelected();

      grid.concluirExclusao(true);

      expect(grid.deleting).toBeFalse();
      expect(grid.selectedItems).toEqual([]);
      expect(selecao).toHaveBeenCalledWith([]);
    });

    it('concluirExclusao(false) libera o botão e mantém a seleção', () => {
      grid.selectedItems = [grid.tableRows[0]];
      grid.onDeleteSelected();

      grid.concluirExclusao(false);

      expect(grid.deleting).toBeFalse();
      expect(grid.selectedItems.length).toBe(1);
    });
  });

  describe('renderização (FE-P2-09)', () => {
    const texto = () => (fixture.nativeElement as HTMLElement).textContent ?? '';

    it('o formatter roda ao montar as linhas, não a cada ciclo de detecção', () => {
      const formatter = jasmine.createSpy('formatter').and.callFake((r: any) => `R$ ${r.valor}`);
      entradas({ columns: [{ field: 'valor', header: 'Valor', type: 'money', formatter }], dataSource: [linha()] });
      const chamadas = formatter.calls.count();

      fixture.detectChanges();
      fixture.detectChanges();
      fixture.detectChanges();

      expect(formatter.calls.count()).toBe(chamadas);
      expect(texto()).toContain('R$ 10');
    });

    it('mostra o rótulo do select e o texto formatado', () => {
      entradas({ columns: colunas, dataSource: [linha()] });

      expect(texto()).toContain('Casa');
      expect(texto()).toContain('R$ 10');
    });

    it('uma chamada da tela via @ViewChild aparece na tela', () => {
      entradas({ columns: colunas, exibeCampos: { selected: true }, dataSource: [linha()] });
      // Seleção feita "pelo usuário": o p-table marca a view como suja.
      grid.selectedItems = [grid.tableRows[0]];
      fixture.debugElement.injector.get(ChangeDetectorRef).markForCheck();
      fixture.detectChanges();
      expect(texto()).toContain('1 selecionado(s)');

      grid.clearSelection();
      fixture.detectChanges();

      expect(texto()).not.toContain('selecionado(s)');
    });

    it('no modo de edição a linha bloqueada mostra o cadeado', () => {
      entradas({
        columns: [...colunas, { field: 'acoes', header: 'Ações', type: 'actions' }],
        bloquearLinha: (r: any) => r.id === 2,
        dataSource: [linha(), linha({ id: 2 })]
      });

      grid.toggleEdicaoTabela();
      fixture.detectChanges();

      const linhas = (fixture.nativeElement as HTMLElement).querySelectorAll('tbody tr');
      expect(linhas[0].classList).not.toContain('row-bloqueada');
      expect(linhas[1].classList).toContain('row-bloqueada');
      expect(linhas[1].querySelector('.pi-lock')).not.toBeNull();
    });
  });

  describe('edição inline', () => {
    it('emite só os campos alterados', () => {
      entradas({ columns: colunas, dataSource: [linha()] });
      const emitido = jasmine.createSpy('saveInline');
      grid.saveInline.subscribe(emitido);
      grid.toggleEdicaoTabela();
      const row = grid.tableRows[0];

      row.nome = 'Luz nova';
      grid.onCellChange(row);
      grid.onSaveAll();

      expect(emitido).toHaveBeenCalledTimes(1);
      expect(emitido.calls.mostRecent().args[0][0].changes).toEqual({ nome: 'Luz nova' });
    });

    it('reverter a linha volta os valores e o texto', () => {
      entradas({ columns: colunas, dataSource: [linha()] });
      grid.toggleEdicaoTabela();
      const row = grid.tableRows[0];

      row.valor = 25;
      grid.onCellChange(row);
      grid.revertRow(row);

      expect(row.valor).toBe(10);
      expect(row.__dg.texto['valor']).toBe('R$ 10');
      expect(grid.pendingCount).toBe(0);
    });
  });
});
