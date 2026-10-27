import { ConfirmationService } from 'primeng/api';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { Dialog } from 'primeng/dialog';
import { of } from 'rxjs';

import { ModalAdicionarEmLoteComponent } from './modal-adicionar-em-lote.component';
import { ContaService } from 'src/app/core/services/contas.service';
import { ContaMensalService } from 'src/app/core/services/conta-mensal.service';
import { AlertService } from 'src/app/shared/components/alert.service';
import { SharedModule } from 'src/app/shared/shared.module';
import { DataGridComponent } from 'src/app/shared/components/data-grid/data-grid.component';

/** Contas em lote num p-dialog (FE-P2-07). */
describe('ModalAdicionarEmLoteComponent', () => {
  let fixture: ComponentFixture<ModalAdicionarEmLoteComponent>;
  let contas: jasmine.SpyObj<ContaService>;
  let mensais: jasmine.SpyObj<ContaMensalService>;

  beforeEach(() => {
    contas = jasmine.createSpyObj<ContaService>('ContaService', ['listarAtivas']);
    contas.listarAtivas.and.returnValue(of([]));
    mensais = jasmine.createSpyObj<ContaMensalService>('ContaMensalService', ['listarDoMes', 'criar']);
    mensais.listarDoMes.and.returnValue(of([]));
    mensais.criar.and.returnValue(of({}));
    TestBed.configureTestingModule({
      declarations: [ModalAdicionarEmLoteComponent],
      imports: [SharedModule, DataGridComponent],
      providers: [
        // O ConfirmacaoService (data-grid, exclusões) usa o do root; no app vem do AppModule.
        ConfirmationService,
        provideNoopAnimations(),
        { provide: ContaService, useValue: contas },
        { provide: ContaMensalService, useValue: mensais },
        { provide: AlertService, useValue: jasmine.createSpyObj('AlertService', ['success', 'error']) }
      ]
    });
    fixture = TestBed.createComponent(ModalAdicionarEmLoteComponent);
    fixture.componentInstance.month = '2026-10';
    fixture.detectChanges();
  });

  it('abre num p-dialog e o X fecha sem recarregar', () => {
    const fechado = jasmine.createSpy('closed');
    fixture.componentInstance.closed.subscribe(fechado);
    const dialogo = fixture.debugElement.query(By.directive(Dialog));

    expect(dialogo.componentInstance.header).toBe('Adicionar contas em lote');
    dialogo.componentInstance.close(new Event('click'));
    expect(fechado).toHaveBeenCalledOnceWith(false);
  });

  it('sem seleção o botão de salvar fica desabilitado', () => {
    const salvar = Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('button'))
      .find(b => b.textContent?.includes('Salvar selecionados'));

    expect(salvar?.disabled).toBeTrue();
  });

  it('conta de valor fixo chega como AGUARDANDO; a de valor variável, como PENDENTE (card #47)', () => {
    const base = { categoriaId: 1, ativo: true, ehParcelado: false, parcelaAtual: 0, quantidadeParcelas: 0 };
    contas.listarAtivas.and.returnValue(of([
      { ...base, id: 1, nome: 'Internet', valor: 120, valorFixo: true },
      { ...base, id: 2, nome: 'Luz', valor: 300, valorFixo: false }
    ]));
    fixture = TestBed.createComponent(ModalAdicionarEmLoteComponent);
    fixture.componentInstance.month = '2026-10';
    fixture.detectChanges();
    fixture.componentInstance.selectedIds = new Set([1, 2]);

    fixture.componentInstance.handleSave();

    const situacoes = mensais.criar.calls.allArgs().map(([p]) => [(p as { nome: string }).nome, (p as { situacao: string }).situacao]);
    expect(situacoes).toEqual([['Internet', 'AGUARDANDO'], ['Luz', 'PENDENTE']]);
  });
});
