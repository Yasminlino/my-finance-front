import { ConfirmationService } from 'primeng/api';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { Dialog } from 'primeng/dialog';
import { of } from 'rxjs';

import { ModalImportacoesMensaisComponent } from './modal-importacoes-mensais.component';
import { ExtratoBancarioService } from 'src/app/core/services/extrato-bancario.service';
import { AlertService } from 'src/app/shared/components/alert.service';
import { SharedModule } from 'src/app/shared/shared.module';
import { DataGridComponent } from 'src/app/shared/components/data-grid/data-grid.component';

/** Importações do mês num p-dialog (FE-P2-07). */
describe('ModalImportacoesMensaisComponent', () => {
  let fixture: ComponentFixture<ModalImportacoesMensaisComponent>;
  let fechado: jasmine.Spy;

  beforeEach(() => {
    const extratos = jasmine.createSpyObj<ExtratoBancarioService>('ExtratoBancarioService', ['listarDoMes', 'excluir']);
    extratos.listarDoMes.and.returnValue(of([]));
    TestBed.configureTestingModule({
      declarations: [ModalImportacoesMensaisComponent],
      imports: [SharedModule, DataGridComponent],
      providers: [
        // O ConfirmacaoService (data-grid, exclusões) usa o do root; no app vem do AppModule.
        ConfirmationService,
        provideNoopAnimations(),
        { provide: ExtratoBancarioService, useValue: extratos },
        { provide: AlertService, useValue: jasmine.createSpyObj('AlertService', ['success', 'error']) }
      ]
    });
    fixture = TestBed.createComponent(ModalImportacoesMensaisComponent);
    fixture.componentInstance.monthFilter = '2026-10';
    fechado = jasmine.createSpy('closed');
    fixture.componentInstance.closed.subscribe(fechado);
    fixture.detectChanges();
  });

  it('abre num p-dialog e o X fecha sem recarregar', () => {
    const dialogo = fixture.debugElement.query(By.directive(Dialog));

    expect(dialogo.componentInstance.header).toBe('Importações realizadas');
    dialogo.componentInstance.close(new Event('click'));
    expect(fechado).toHaveBeenCalledOnceWith(false);
  });

  it('Concluir fecha recarregando', () => {
    const concluir = Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('button'))
      .find(b => b.textContent?.includes('Concluir'))!;

    concluir.click();

    expect(fechado).toHaveBeenCalledOnceWith(true);
  });
});
