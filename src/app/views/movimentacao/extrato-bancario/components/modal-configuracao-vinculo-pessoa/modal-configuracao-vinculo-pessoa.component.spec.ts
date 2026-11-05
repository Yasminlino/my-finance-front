import { ConfirmationService } from 'primeng/api';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { Dialog } from 'primeng/dialog';
import { of } from 'rxjs';

import { ModalConfiguracaoVinculoPessoaComponent } from './modal-configuracao-vinculo-pessoa.component';
import { PessoaMovimentacaoService } from 'src/app/core/services/pessoa-movimentacao.service';
import { CategoryService } from 'src/app/core/services/category.service';
import { TipoMovimentacaoService } from 'src/app/core/services/tipo-movimentacao.service';
import { ExtratoBancarioItemService } from 'src/app/core/services/extrato-bancario-item.service';
import { AlertService } from 'src/app/shared/components/alert.service';

/** Vínculos de pessoa num p-dialog (FE-P2-07). */
describe('ModalConfiguracaoVinculoPessoaComponent', () => {
  let fixture: ComponentFixture<ModalConfiguracaoVinculoPessoaComponent>;
  let pessoas: jasmine.SpyObj<PessoaMovimentacaoService>;

  beforeEach(() => {
    pessoas = jasmine.createSpyObj<PessoaMovimentacaoService>('PessoaMovimentacaoService', ['listar', 'criar', 'atualizar', 'excluir']);
    pessoas.listar.and.returnValue(of([]));
    pessoas.criar.and.returnValue(of({ id: 1, nomePessoa: '', categoriaId: null, tipoMovimentacaoId: null }));
    pessoas.atualizar.and.returnValue(of({ id: 7, nomePessoa: '', categoriaId: null, tipoMovimentacaoId: null }));
    const categorias = jasmine.createSpyObj<CategoryService>('CategoryService', ['listarAtivas']);
    categorias.listarAtivas.and.returnValue(of([]));
    const tipos = jasmine.createSpyObj<TipoMovimentacaoService>('TipoMovimentacaoService', ['listar']);
    tipos.listar.and.returnValue(of([]));
    TestBed.configureTestingModule({
      imports: [ModalConfiguracaoVinculoPessoaComponent],
      providers: [
        // O ConfirmacaoService (data-grid, exclusões) usa o do root; no app vem do AppModule.
        ConfirmationService,
        provideNoopAnimations(),
        { provide: PessoaMovimentacaoService, useValue: pessoas },
        { provide: CategoryService, useValue: categorias },
        { provide: TipoMovimentacaoService, useValue: tipos },
        { provide: ExtratoBancarioItemService, useValue: jasmine.createSpyObj('ExtratoBancarioItemService', ['atualizar']) },
        { provide: AlertService, useValue: jasmine.createSpyObj('AlertService', ['success', 'error']) }
      ]
    });
    fixture = TestBed.createComponent(ModalConfiguracaoVinculoPessoaComponent);
    fixture.componentInstance.monthFilter = '2026-10';
    fixture.detectChanges();
  });

  it('abre num p-dialog e o X fecha sem recarregar', () => {
    const fechado = jasmine.createSpy('closed');
    fixture.componentInstance.closed.subscribe(fechado);
    const dialogo = fixture.debugElement.query(By.directive(Dialog));

    expect(dialogo.componentInstance.header).toBe('Vínculos cadastrados');
    dialogo.componentInstance.close(new Event('click'));
    expect(fechado).toHaveBeenCalledOnceWith(false);
  });

  it('salvar grava os ids escolhidos nos selects; id negativo cria, positivo atualiza', () => {
    fixture.componentInstance.onSaveInline([
      { row: { id: 7, nomePessoa: 'Ana', categoriaId: 3, tipoMovimentacaoId: 2 }, changes: { categoriaId: 3 } },
      { row: { id: -1, nomePessoa: ' João ', categoriaId: null, tipoMovimentacaoId: 5 }, changes: { nomePessoa: ' João ', tipoMovimentacaoId: 5 } }
    ]);

    expect(pessoas.atualizar).toHaveBeenCalledOnceWith(
      { id: 7, nomePessoa: 'Ana', categoriaId: 3, tipoMovimentacaoId: 2, entraNosAcertos: false, mesAtualizacao: '2026-10' });
    expect(pessoas.criar).toHaveBeenCalledOnceWith(
      { nomePessoa: 'João', categoriaId: null, tipoMovimentacaoId: 5, entraNosAcertos: false, mesAtualizacao: '2026-10' });
  });

  it('"Entra nos acertos" é uma coluna Sim/Não que vai na gravação (parte 2)', () => {
    const coluna = fixture.componentInstance.gridColumns.find(c => c.field === 'entraNosAcertos');
    expect(coluna?.header).toBe('ENTRA NOS ACERTOS');
    expect(coluna?.options).toEqual([{ label: 'Sim', value: true }, { label: 'Não', value: false }]);

    fixture.componentInstance.onSaveInline([
      { row: { id: 7, nomePessoa: 'ANA', categoriaId: null, tipoMovimentacaoId: null, entraNosAcertos: false }, changes: { entraNosAcertos: true } }
    ]);
    expect(pessoas.atualizar).toHaveBeenCalledOnceWith(jasmine.objectContaining({ id: 7, entraNosAcertos: true }));
  });

  it('o "Eu" vem primeiro, com esse nome, e travado (sem editar nem excluir)', () => {
    pessoas.listar.and.returnValue(of([
      { id: 7, nomePessoa: 'CARLOS', categoriaId: null, tipoMovimentacaoId: null, entraNosAcertos: true },
      { id: 1, nomePessoa: 'EU', categoriaId: null, tipoMovimentacaoId: null, ehTitular: true }
    ]));
    fixture.componentInstance.ngOnInit();

    const [eu, carlos] = fixture.componentInstance.pessoaMovimentacao;
    expect(eu).toEqual(jasmine.objectContaining({ id: 1, nomePessoa: 'Eu', somenteLeitura: true }));
    expect(carlos.id).toBe(7);
    expect(fixture.componentInstance.bloquear(eu)).toBeTrue();
    expect(fixture.componentInstance.bloquear(carlos)).toBeFalse();
  });
});
