import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { of, throwError } from 'rxjs';

import { DividirLancamentoComponent } from './dividir-lancamento.component';
import { ExtratoItemDto } from 'src/app/core/models/extrato.model';
import { ExtratoBancarioItemService } from 'src/app/core/services/extrato-bancario-item.service';
import { AlertService } from 'src/app/shared/components/alert.service';

/** Editor de partes do lançamento (card #76, fase 3). */
describe('DividirLancamentoComponent', () => {
  let fixture: ComponentFixture<DividirLancamentoComponent>;
  let servico: jasmine.SpyObj<ExtratoBancarioItemService>;
  let alerta: jasmine.SpyObj<AlertService>;
  const comp = () => fixture.componentInstance;
  const base: ExtratoItemDto = { id: 10, dataMovimentacao: '2026-10-05', valor: 300, tipoLancamento: 'Saída', descricao: 'Mercado', categoriaId: 8, pessoaMovimentacaoId: 77 };

  const criar = (item: ExtratoItemDto) => {
    fixture = TestBed.createComponent(DividirLancamentoComponent);
    fixture.componentRef.setInput('item', item);
    fixture.componentRef.setInput('categorias', [{ label: 'Alimentação', value: 8 }, { label: 'Beleza', value: 9 }]);
    fixture.componentRef.setInput('pessoas', [{ label: 'Carlos', value: 10 }]);
    fixture.detectChanges();
  };

  beforeEach(() => {
    servico = jasmine.createSpyObj<ExtratoBancarioItemService>('ExtratoBancarioItemService', ['dividir']);
    servico.dividir.and.returnValue(of({}));
    alerta = jasmine.createSpyObj<AlertService>('AlertService', ['success', 'error']);
    TestBed.configureTestingModule({
      imports: [DividirLancamentoComponent],
      providers: [provideNoopAnimations(), { provide: ExtratoBancarioItemService, useValue: servico }, { provide: AlertService, useValue: alerta }]
    });
  });

  afterEach(() => fixture.destroy());

  it('começa com 2 partes e a categoria do lançamento; pessoa fora das opções não vem', () => {
    criar(base);
    expect(comp().linhas.length).toBe(2);
    expect(comp().linhas[0]).toEqual({ valor: null, categoriaId: 8, pessoaMovimentacaoId: null });
    expect(comp().falta).toBe(300);
    expect(comp().podeSalvar).toBeFalse();
  });

  it('só salva quando a soma bate; "usar o que falta" completa', () => {
    const fechado = jasmine.createSpy('fechado');
    criar(base);
    comp().fechado.subscribe(fechado);
    comp().linhas[0].valor = 200.1;
    expect(comp().falta).toBe(99.9);
    comp().completar(comp().linhas[1]);
    comp().linhas[1].pessoaMovimentacaoId = 10;
    expect(comp().podeSalvar).toBeTrue();

    comp().salvar();

    expect(servico.dividir).toHaveBeenCalledWith(10, [
      { valor: 200.1, categoriaId: 8, pessoaMovimentacaoId: null },
      { valor: 99.9, categoriaId: null, pessoaMovimentacaoId: 10 }
    ]);
    expect(fechado).toHaveBeenCalledWith(true);
  });

  it('passou do valor não salva; mínimo de 2 partes', () => {
    criar(base);
    comp().linhas[0].valor = 400;
    comp().linhas[1].valor = 1;
    expect(comp().falta).toBe(-101);
    expect(comp().podeSalvar).toBeFalse();
    comp().remover(0);
    expect(comp().linhas.length).toBe(2);
    comp().adicionar();
    comp().remover(2);
    expect(comp().linhas.length).toBe(2);
  });

  it('já dividido abre as partes e pode desfazer', () => {
    criar({ ...base, partes: [{ valor: 200, categoriaId: 8 }, { valor: 100, categoriaId: 9, pessoaMovimentacaoId: 10 }] });
    expect(comp().falta).toBe(0);
    expect(comp().linhas[1].pessoaMovimentacaoId).toBe(10);
    comp().desfazer();
    expect(servico.dividir).toHaveBeenCalledWith(10, []);
  });

  it('erro da API avisa e não fecha', () => {
    servico.dividir.and.returnValue(throwError(() => new Error('falhou')));
    const fechado = jasmine.createSpy('fechado');
    criar({ ...base, partes: [{ valor: 200 }, { valor: 100 }] });
    comp().fechado.subscribe(fechado);
    comp().salvar();
    expect(alerta.error).toHaveBeenCalled();
    expect(fechado).not.toHaveBeenCalled();
  });
});
