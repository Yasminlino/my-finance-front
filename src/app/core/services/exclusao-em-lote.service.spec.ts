import { TestBed } from '@angular/core/testing';
import { firstValueFrom, of, throwError } from 'rxjs';
import { MessageService } from 'primeng/api';
import { AlertService } from 'src/app/shared/components/alert.service';
import { ConfirmacaoService } from 'src/app/core/services/confirmacao.service';
import { ExclusaoEmLoteService } from './exclusao-em-lote.service';

describe('ExclusaoEmLoteService', () => {
  let service: ExclusaoEmLoteService;
  let alertService: jasmine.SpyObj<AlertService>;
  let confirmacao: jasmine.SpyObj<ConfirmacaoService>;

  const rotulo = { singular: 'conta', plural: 'contas', feminino: true };
  const rows = [{ id: 1 }, { id: 2 }, { id: 3 }];

  beforeEach(() => {
    alertService = jasmine.createSpyObj<AlertService>('AlertService', [
      'success',
      'error',
      'info',
      'secondary',
      'contrast'
    ]);

    confirmacao = jasmine.createSpyObj<ConfirmacaoService>('ConfirmacaoService', ['confirmar']);

    TestBed.configureTestingModule({
      providers: [
        ExclusaoEmLoteService,
        { provide: AlertService, useValue: alertService },
        { provide: ConfirmacaoService, useValue: confirmacao },
        MessageService
      ]
    });

    service = TestBed.inject(ExclusaoEmLoteService);
  });

  it('avisa sucesso mesmo quando o endpoint devolve vazio (FE-P0-08)', async () => {
    // O bloco antigo guardava só o último retorno: com 204/undefined, nada era informado.
    const resultado = await firstValueFrom(service.excluir(rows, () => of(undefined), rotulo));

    expect(resultado).toEqual({ total: 3, excluidos: 3, falhas: 0 });
    expect(alertService.success).toHaveBeenCalledWith('3 contas excluídas com sucesso!');
    expect(alertService.error).not.toHaveBeenCalled();
  });

  it('não aborta no primeiro erro e conta sucessos e falhas', async () => {
    const resultado = await firstValueFrom(service.excluir(
      rows,
      row => (row.id === 2 ? throwError(() => new Error('vinculada')) : of({})),
      rotulo
    ));

    expect(resultado).toEqual({ total: 3, excluidos: 2, falhas: 1 });
    // Antes a mensagem dizia que os 3 falharam e os itens 3 em diante nem eram tentados.
    expect(alertService.error).not.toHaveBeenCalled();
    expect(alertService.contrast).toHaveBeenCalled();

    const [titulo, mensagem] = alertService.contrast.calls.mostRecent().args;
    expect(titulo).toBe('Exclusão parcial');
    expect(mensagem).toContain('2 de 3 contas excluídas');
    expect(mensagem).toContain('vinculada');
  });

  it('tenta todos os itens, inclusive depois de uma falha', async () => {
    const tentados: number[] = [];

    await firstValueFrom(service.excluir(
      rows,
      row => {
        tentados.push(row.id);
        return row.id === 1 ? throwError(() => new Error('x')) : of({});
      },
      rotulo
    ));

    expect(tentados).toEqual([1, 2, 3]);
  });

  it('reporta erro quando nada foi excluído', async () => {
    const resultado = await firstValueFrom(service.excluir(rows, () => throwError(() => new Error('sem permissão')), rotulo));

    expect(resultado).toEqual({ total: 3, excluidos: 0, falhas: 3 });
    expect(alertService.success).not.toHaveBeenCalled();
    expect(alertService.error.calls.mostRecent().args[0]).toContain('Nenhum item foi excluído');
  });

  it('concorda em gênero e número', async () => {
    await firstValueFrom(service.excluir([{ id: 1 }], () => of({}), rotulo));
    expect(alertService.success).toHaveBeenCalledWith('1 conta excluída com sucesso!');

    alertService.success.calls.reset();

    await firstValueFrom(service.excluir(
      [{ id: 1 }, { id: 2 }],
      () => of({}),
      { singular: 'banco', plural: 'bancos' }
    ));
    expect(alertService.success).toHaveBeenCalledWith('2 bancos excluídos com sucesso!');
  });

  it('não emite mensagem para lote vazio', async () => {
    const resultado = await firstValueFrom(service.excluir([], () => of({}), rotulo));

    expect(resultado).toEqual({ total: 0, excluidos: 0, falhas: 0 });
    expect(alertService.success).not.toHaveBeenCalled();
    expect(alertService.error).not.toHaveBeenCalled();
    expect(alertService.contrast).not.toHaveBeenCalled();
  });

  describe('confirmarEExcluir (FE-P1-01)', () => {
    let grid: { concluirExclusao: jasmine.Spy };

    beforeEach(() => {
      grid = { concluirExclusao: jasmine.createSpy('concluirExclusao') };
    });

    it('pergunta com o rótulo, exclui, limpa a seleção e libera o grid', async () => {
      const confirm = confirmacao.confirmar.and.resolveTo(true);
      const excluirItem = jasmine.createSpy('excluirItem').and.returnValue(of(null));

      const executou = await firstValueFrom(service.confirmarEExcluir(grid, rows, excluirItem, rotulo));

      expect(executou).toBeTrue();
      expect(confirm).toHaveBeenCalledWith('Excluir 3 contas selecionadas?');
      expect(excluirItem).toHaveBeenCalledTimes(3);
      expect(grid.concluirExclusao).toHaveBeenCalledOnceWith(true);
      expect(alertService.success).toHaveBeenCalledWith('3 contas excluídas com sucesso!');
    });

    it('concorda a pergunta no singular e no masculino', async () => {
      const confirm = confirmacao.confirmar.and.resolveTo(true);

      await firstValueFrom(service.confirmarEExcluir(grid, [{ id: 1 }], () => of(null), { singular: 'banco', plural: 'bancos' }));

      expect(confirm).toHaveBeenCalledWith('Excluir 1 banco selecionado?');
    });

    it('cancelado: não exclui, não limpa a seleção e libera o grid', async () => {
      confirmacao.confirmar.and.resolveTo(false);
      const excluirItem = jasmine.createSpy('excluirItem');

      const executou = await firstValueFrom(service.confirmarEExcluir(grid, rows, excluirItem, rotulo));

      expect(executou).toBeFalse();
      expect(excluirItem).not.toHaveBeenCalled();
      expect(grid.concluirExclusao).toHaveBeenCalledOnceWith(false);
    });

    it('lista vazia: nem pergunta e libera o grid', async () => {
      const confirm = confirmacao.confirmar;

      const executou = await firstValueFrom(service.confirmarEExcluir(grid, [], () => of(null), rotulo));

      expect(executou).toBeFalse();
      expect(confirm).not.toHaveBeenCalled();
      expect(grid.concluirExclusao).toHaveBeenCalledOnceWith(false);
    });

    it('sucesso não emite erro genérico extra (bug do finally em Contas a Pagar)', async () => {
      confirmacao.confirmar.and.resolveTo(true);

      await firstValueFrom(service.confirmarEExcluir(grid, rows, () => of(null), rotulo));

      expect(alertService.error).not.toHaveBeenCalled();
    });

    it('funciona sem grid', async () => {
      confirmacao.confirmar.and.resolveTo(true);

      const executou = await firstValueFrom(service.confirmarEExcluir(undefined, rows, () => of(null), rotulo));

      expect(executou).toBeTrue();
    });
  });
});
