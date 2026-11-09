import { TestBed } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { ConfirmationService } from 'primeng/api';
import { of } from 'rxjs';

import { VerNotaComponent } from './ver-nota.component';
import { ConfirmacaoService } from 'src/app/core/services/confirmacao.service';
import { ExtratoBancarioItemService } from 'src/app/core/services/extrato-bancario-item.service';
import { AlertService } from 'src/app/shared/components/alert.service';

/** Modal da nota salva (card #76, fase 6). */
describe('VerNotaComponent', () => {
  let servico: jasmine.SpyObj<ExtratoBancarioItemService>;

  const criar = () => {
    const fixture = TestBed.createComponent(VerNotaComponent);
    fixture.componentRef.setInput('itemId', 10);
    fixture.detectChanges();
    return fixture;
  };

  beforeEach(() => {
    servico = jasmine.createSpyObj<ExtratoBancarioItemService>('ExtratoBancarioItemService', ['obterNota', 'removerNota']);
    servico.obterNota.and.returnValue(of({ estabelecimento: 'Circuito', total: 30, itens: [{ nome: 'Ração', quantidade: 2, valor: 30, categoriaNome: 'Pet' }] }));
    servico.removerNota.and.returnValue(of({}));
    TestBed.configureTestingModule({
      imports: [VerNotaComponent],
      providers: [provideNoopAnimations(), ConfirmationService, { provide: ExtratoBancarioItemService, useValue: servico },
        { provide: AlertService, useValue: jasmine.createSpyObj('AlertService', ['success', 'error']) }]
    });
  });

  it('mostra o estabelecimento, os itens e o total', () => {
    const f = criar();
    const texto = (document.body.textContent ?? '').replace(/\s+/g, ' ');
    expect(servico.obterNota).toHaveBeenCalledWith(10);
    expect(texto).toContain('Circuito');
    expect(texto).toContain('Ração');
    expect(texto).toContain('Pet');
    expect(texto).toMatch(/2 × R\$\s*15,00/);
    expect(texto).not.toContain('Sem categoria');
    f.destroy();
  });

  it('remover confirma antes e avisa a tela', async () => {
    const f = criar();
    const fechado = jasmine.createSpy('fechado');
    f.componentInstance.fechado.subscribe(fechado);
    spyOn(TestBed.inject(ConfirmacaoService), 'confirmar').and.resolveTo(true);

    await f.componentInstance.remover();

    expect(servico.removerNota).toHaveBeenCalledWith(10);
    expect(fechado).toHaveBeenCalledWith(true);
    f.destroy();
  });
});
