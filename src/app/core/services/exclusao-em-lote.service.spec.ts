import { TestBed } from '@angular/core/testing';
import { MessageService } from 'primeng/api';
import { AlertService } from 'src/app/shared/components/alert.service';
import { ExclusaoEmLoteService } from './exclusao-em-lote.service';

describe('ExclusaoEmLoteService', () => {
  let service: ExclusaoEmLoteService;
  let alertService: jasmine.SpyObj<AlertService>;

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

    TestBed.configureTestingModule({
      providers: [
        ExclusaoEmLoteService,
        { provide: AlertService, useValue: alertService },
        MessageService
      ]
    });

    service = TestBed.inject(ExclusaoEmLoteService);
  });

  it('avisa sucesso mesmo quando o endpoint devolve vazio (FE-P0-08)', async () => {
    // O bloco antigo guardava só o último retorno: com 204/undefined, nada era informado.
    const resultado = await service.excluir(rows, () => Promise.resolve(undefined), rotulo);

    expect(resultado).toEqual({ total: 3, excluidos: 3, falhas: 0 });
    expect(alertService.success).toHaveBeenCalledWith('3 contas excluídas com sucesso!');
    expect(alertService.error).not.toHaveBeenCalled();
  });

  it('não aborta no primeiro erro e conta sucessos e falhas', async () => {
    const resultado = await service.excluir(
      rows,
      row => (row.id === 2 ? Promise.reject(new Error('vinculada')) : Promise.resolve({})),
      rotulo
    );

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

    await service.excluir(
      rows,
      row => {
        tentados.push(row.id);
        return row.id === 1 ? Promise.reject(new Error('x')) : Promise.resolve({});
      },
      rotulo
    );

    expect(tentados).toEqual([1, 2, 3]);
  });

  it('reporta erro quando nada foi excluído', async () => {
    const resultado = await service.excluir(rows, () => Promise.reject(new Error('sem permissão')), rotulo);

    expect(resultado).toEqual({ total: 3, excluidos: 0, falhas: 3 });
    expect(alertService.success).not.toHaveBeenCalled();
    expect(alertService.error.calls.mostRecent().args[0]).toContain('Nenhum item foi excluído');
  });

  it('concorda em gênero e número', async () => {
    await service.excluir([{ id: 1 }], () => Promise.resolve({}), rotulo);
    expect(alertService.success).toHaveBeenCalledWith('1 conta excluída com sucesso!');

    alertService.success.calls.reset();

    await service.excluir(
      [{ id: 1 }, { id: 2 }],
      () => Promise.resolve({}),
      { singular: 'banco', plural: 'bancos' }
    );
    expect(alertService.success).toHaveBeenCalledWith('2 bancos excluídos com sucesso!');
  });

  it('não emite mensagem para lote vazio', async () => {
    const resultado = await service.excluir([], () => Promise.resolve({}), rotulo);

    expect(resultado).toEqual({ total: 0, excluidos: 0, falhas: 0 });
    expect(alertService.success).not.toHaveBeenCalled();
    expect(alertService.error).not.toHaveBeenCalled();
    expect(alertService.contrast).not.toHaveBeenCalled();
  });
});
