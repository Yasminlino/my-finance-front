import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { firstValueFrom, of, throwError } from 'rxjs';
import { AlertService } from 'src/app/shared/components/alert.service';
import { ExclusaoEmLoteService, RotuloEntidade } from 'src/app/core/services/exclusao-em-lote.service';
import { CadastroListBase } from './cadastro-list.base';

type Item = { id: number; nome: string };

@Component({ template: '' })
class ItemListTesteComponent extends CadastroListBase<Item> {
  protected readonly rotulo: RotuloEntidade = { singular: 'categoria', plural: 'categorias', feminino: true };

  dados: Item[] = [];
  buscarSpy = jasmine.createSpy('buscar').and.callFake(() => of(this.dados));
  excluirSpy = jasmine.createSpy('excluir').and.returnValue(of(null));
  antesSpy = jasmine.createSpy('antesDeCarregar').and.returnValue(of(null));

  protected buscar() { return this.buscarSpy(); }
  protected excluirRegistro(id: number) { return this.excluirSpy(id); }
  protected nomeDe(item: Item) { return item.nome; }
  protected override antesDeCarregar() { return this.antesSpy(); }
}

describe('CadastroListBase (FE-P1-02)', () => {
  let tela: ItemListTesteComponent;
  let alertService: jasmine.SpyObj<AlertService>;
  let exclusao: jasmine.SpyObj<ExclusaoEmLoteService>;

  beforeEach(() => {
    alertService = jasmine.createSpyObj<AlertService>('AlertService', ['success', 'error', 'info', 'contrast']);
    exclusao = jasmine.createSpyObj<ExclusaoEmLoteService>('ExclusaoEmLoteService', ['confirmarEExcluir']);

    TestBed.configureTestingModule({
      declarations: [ItemListTesteComponent],
      providers: [
        { provide: AlertService, useValue: alertService },
        { provide: ExclusaoEmLoteService, useValue: exclusao }
      ]
    });

    tela = TestBed.createComponent(ItemListTesteComponent).componentInstance;
    tela.dados = [{ id: 2, nome: 'Mercado' }, { id: 1, nome: 'Aluguel' }, { id: 3, nome: 'Lazer' }];
  });

  it('ngOnInit roda antesDeCarregar e depois carrega', async () => {
    await tela.ngOnInit();

    expect(tela.antesSpy).toHaveBeenCalledBefore(tela.buscarSpy);
    expect(tela.registros.length).toBe(3);
  });

  it('exibe ordenado por nome sem reordenar a fonte (FE-P0-10)', async () => {
    await tela.load();

    expect(tela.registrosExibidos.map(i => i.nome)).toEqual(['Aluguel', 'Lazer', 'Mercado']);
    expect(tela.registros.map(i => i.nome)).toEqual(['Mercado', 'Aluguel', 'Lazer']);
    expect(tela.loading).toBeFalse();
  });

  it('falha de carga avisa com a mensagem da API e libera o loading', async () => {
    tela.buscarSpy.and.returnValue(throwError(() => ({ error: { message: 'API fora' } })));

    await tela.load();

    expect(alertService.error).toHaveBeenCalledWith('API fora');
    expect(tela.loading).toBeFalse();
  });

  it('falha de carga sem mensagem usa o rótulo', async () => {
    tela.buscarSpy.and.returnValue(throwError(() => null));

    await tela.load();

    expect(alertService.error).toHaveBeenCalledWith('Erro ao carregar categorias.');
  });

  it('openCreate / onEdit / closeForm controlam o modal', async () => {
    tela.openCreate();
    expect(tela.showModalForm).toBeTrue();
    expect(tela.editing).toBeNull();

    tela.onEdit(tela.dados[0]);
    expect(tela.editing).toBe(tela.dados[0]);

    tela.closeForm();
    expect(tela.showModalForm).toBeFalse();
    expect(tela.editing).toBeNull();
    expect(tela.buscarSpy).not.toHaveBeenCalled();

    tela.closeForm(true);
    expect(tela.buscarSpy).toHaveBeenCalled();
  });

  it('onDelete confirma com artigo e nome, exclui e recarrega', async () => {
    const confirm = spyOn(window, 'confirm').and.returnValue(true);

    await tela.onDelete({ id: 7, nome: 'Lazer' });

    expect(confirm).toHaveBeenCalledWith('Excluir a categoria "Lazer"?');
    expect(tela.excluirSpy).toHaveBeenCalledWith(7);
    expect(alertService.success).toHaveBeenCalledWith('Categoria excluída com sucesso!');
    expect(tela.buscarSpy).toHaveBeenCalled();
  });

  it('onDelete cancelado não exclui', async () => {
    spyOn(window, 'confirm').and.returnValue(false);

    await tela.onDelete({ id: 7, nome: 'Lazer' });

    expect(tela.excluirSpy).not.toHaveBeenCalled();
  });

  it('onDelete com erro mostra a mensagem da API', async () => {
    spyOn(window, 'confirm').and.returnValue(true);
    tela.excluirSpy.and.returnValue(throwError(() => ({ error: { message: 'Possui vínculos' } })));

    await tela.onDelete({ id: 7, nome: 'Lazer' });

    expect(alertService.error).toHaveBeenCalledWith('Possui vínculos');
  });

  it('onDelete com erro sem mensagem usa o rótulo', async () => {
    spyOn(window, 'confirm').and.returnValue(true);
    tela.excluirSpy.and.returnValue(throwError(() => null));

    await tela.onDelete({ id: 7, nome: 'Lazer' });

    expect(alertService.error).toHaveBeenCalledWith('Falha ao excluir. Categoria pode estar vinculada a outros registros.');
  });

  it('onDeleteSelected delega ao serviço e recarrega só se excluiu', async () => {
    exclusao.confirmarEExcluir.and.returnValue(of(false));
    await tela.onDeleteSelected([tela.dados[0]]);
    expect(tela.buscarSpy).not.toHaveBeenCalled();

    exclusao.confirmarEExcluir.and.returnValue(of(true));
    await tela.onDeleteSelected([tela.dados[0]]);
    expect(tela.buscarSpy).toHaveBeenCalled();

    const [, rows, excluirItem, rotulo] = exclusao.confirmarEExcluir.calls.mostRecent().args;
    expect(rows).toEqual([tela.dados[0]]);
    expect(rotulo.plural).toBe('categorias');

    await firstValueFrom(excluirItem(tela.dados[0]));
    expect(tela.excluirSpy).toHaveBeenCalledWith(2);
  });
});
