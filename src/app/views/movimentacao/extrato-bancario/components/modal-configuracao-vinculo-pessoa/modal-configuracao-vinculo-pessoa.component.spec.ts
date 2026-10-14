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
import { SharedModule } from 'src/app/shared/shared.module';
import { DataGridComponent } from 'src/app/shared/components/data-grid/data-grid.component';

/** Vínculos de pessoa num p-dialog (FE-P2-07). */
describe('ModalConfiguracaoVinculoPessoaComponent', () => {
  let fixture: ComponentFixture<ModalConfiguracaoVinculoPessoaComponent>;

  beforeEach(() => {
    const pessoas = jasmine.createSpyObj<PessoaMovimentacaoService>('PessoaMovimentacaoService', ['listar', 'criar', 'atualizar', 'excluir']);
    pessoas.listar.and.returnValue(of([]));
    const categorias = jasmine.createSpyObj<CategoryService>('CategoryService', ['listarAtivas']);
    categorias.listarAtivas.and.returnValue(of([]));
    const tipos = jasmine.createSpyObj<TipoMovimentacaoService>('TipoMovimentacaoService', ['listar']);
    tipos.listar.and.returnValue(of([]));
    TestBed.configureTestingModule({
      declarations: [ModalConfiguracaoVinculoPessoaComponent],
      imports: [SharedModule, DataGridComponent],
      providers: [
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
});
