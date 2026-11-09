import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { of, throwError } from 'rxjs';

import { LerNotaComponent } from './ler-nota.component';
import { ExtratoBancarioItemService } from 'src/app/core/services/extrato-bancario-item.service';
import { AlertService } from 'src/app/shared/components/alert.service';

/** Ler a nota pelo QR Code (card #76, fase 6). */
describe('LerNotaComponent', () => {
  let fixture: ComponentFixture<LerNotaComponent>;
  let servico: jasmine.SpyObj<ExtratoBancarioItemService>;
  let alerta: jasmine.SpyObj<AlertService>;
  const comp = () => fixture.componentInstance;
  const nota = () => ({
    estabelecimento: 'Mercado', total: 76.6,
    itens: [{ nome: 'Sabão', quantidade: 1, valor: 22.9, categoriaId: 8 }, { nome: 'Ração', quantidade: 1, valor: 21.88, categoriaId: null }, { nome: 'Chocolate', quantidade: 2, valor: 31.82, categoriaId: 8 }]
  });

  beforeEach(() => {
    servico = jasmine.createSpyObj<ExtratoBancarioItemService>('ExtratoBancarioItemService', ['lerNota', 'salvarNota']);
    servico.salvarNota.and.returnValue(of({ classificado: true, mensagem: 'ok' }));
    servico.lerNota.and.returnValue(of(nota()));
    alerta = jasmine.createSpyObj<AlertService>('AlertService', ['error', 'success']);
    TestBed.configureTestingModule({
      imports: [LerNotaComponent],
      providers: [provideNoopAnimations(), { provide: ExtratoBancarioItemService, useValue: servico }, { provide: AlertService, useValue: alerta }]
    });
    fixture = TestBed.createComponent(LerNotaComponent);
    fixture.componentRef.setInput('categorias', [{ label: 'Casa', value: 8 }]);
    fixture.componentRef.setInput('itemId', 10);
    fixture.componentRef.setInput('valorDoLancamento', 76.6);
    fixture.detectChanges();
  });

  afterEach(() => fixture.destroy());

  it('lê pelo link e salva a nota no lançamento', () => {
    const concluiu = jasmine.createSpy('concluiu');
    comp().concluiu.subscribe(concluiu);

    comp().ler('  https://link  ');
    expect(servico.lerNota).toHaveBeenCalledWith('https://link');
    expect(comp().diferenca).toBe(0);

    comp().salvar();
    expect(servico.salvarNota).toHaveBeenCalledWith(10, jasmine.objectContaining({ estabelecimento: 'Mercado' }));
    expect(concluiu).toHaveBeenCalledWith(true);
  });

  it('avisa quando o total da nota não bate com o lançamento', () => {
    fixture.componentRef.setInput('valorDoLancamento', 70);
    comp().ler('x');
    fixture.detectChanges();
    expect(comp().diferenca).toBe(6.6);
    expect(document.querySelector('.nota-aviso')).not.toBeNull();
  });

  it('erro da API avisa e continua na tela de leitura', () => {
    servico.lerNota.and.returnValue(throwError(() => new Error('x')));
    comp().ler('x');
    expect(alerta.error).toHaveBeenCalled();
    expect(comp().nota).toBeNull();
  });
});
