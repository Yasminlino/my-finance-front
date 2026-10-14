import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';

import { ModalLancamentoManualComponent } from './modal-lancamento-manual.component';
import { ExtratoBancarioItemService } from 'src/app/core/services/extrato-bancario-item.service';
import { AlertService } from 'src/app/shared/components/alert.service';
import { BancoDto } from 'src/app/core/models/banco.model';
import { TipoCartaoDto } from 'src/app/core/models/tipo-cartao.model';

/** Lançamento manual único do Extrato (Resumo e Detalhes), em formulário Reactive (FE-P2-10). */
describe('ModalLancamentoManualComponent', () => {
  let fixture: ComponentFixture<ModalLancamentoManualComponent>;
  let modal: ModalLancamentoManualComponent;
  let itens: jasmine.SpyObj<ExtratoBancarioItemService>;
  let alertas: jasmine.SpyObj<AlertService>;

  const tiposCartao: TipoCartaoDto[] = [
    { id: 1, nomeTipoCartao: 'Cartão de crédito', ehCredito: true, ehSistema: true },
    { id: 2, nomeTipoCartao: 'Conta corrente', ehCredito: false, ehSistema: true }
  ];
  const bancos = [
    { id: 5, nomeBanco: 'NuBank', tipoCartaoId: 2 },
    { id: 18, nomeBanco: 'Bradesco', tipoCartaoId: 1 }
  ] as BancoDto[];

  const entradas = (valores: Record<string, unknown>) => {
    Object.entries({ mes: '2026-12', bancos, tiposCartao, categorias: [], pessoas: [], ...valores })
      .forEach(([nome, valor]) => fixture.componentRef.setInput(nome, valor));
    fixture.detectChanges();
  };
  const preencher = (valores: Record<string, unknown>) => modal.form.patchValue(valores);
  const texto = () => (fixture.nativeElement as HTMLElement).textContent ?? '';

  beforeEach(() => {
    itens = jasmine.createSpyObj<ExtratoBancarioItemService>('ExtratoBancarioItemService', ['criar']);
    itens.criar.and.returnValue(of({}));
    alertas = jasmine.createSpyObj<AlertService>('AlertService', ['success', 'error']);
    TestBed.configureTestingModule({
      providers: [
        { provide: ExtratoBancarioItemService, useValue: itens },
        { provide: AlertService, useValue: alertas }
      ]
    });
    fixture = TestBed.createComponent(ModalLancamentoManualComponent);
    modal = fixture.componentInstance;
  });

  it('abre com a data no dia 1 do mês, Saída e a fatura sugerida pelo mês', () => {
    entradas({});

    expect(modal.form.getRawValue().dataMovimentacao).toBe('2026-12-01');
    expect(modal.form.getRawValue().tipoLancamento).toBe('Saída');
    expect(modal.form.getRawValue().numeroFatura).toBe('2026-12');
  });

  it('sem valor (ou com zero) não grava e mostra o erro no campo', () => {
    entradas({ bancoFixoId: 5 });

    modal.salvar();
    preencher({ valor: 0 });
    modal.salvar();
    fixture.detectChanges();

    expect(itens.criar).not.toHaveBeenCalled();
    expect(texto()).toContain('Informe um valor maior que zero.');
  });

  it('banco fixo: o campo fica desabilitado e o item vai com o banco e o tipo de conta', () => {
    entradas({ bancoFixoId: 5 });
    preencher({ valor: 15.5 });

    modal.salvar();

    expect(modal.form.controls.bancoId.disabled).toBeTrue();
    const dto = itens.criar.calls.mostRecent().args[0];
    expect(dto.bancoId).toBe(5);
    expect(dto.tipoCartaoId).toBe(2);
    expect(dto.valor).toBe(15.5);
    expect(dto.numeroFatura).toBeNull();
  });

  it('banco escolhido: sem banco não grava; cartão de crédito mostra os campos de fatura', () => {
    entradas({});
    preencher({ valor: 10 });
    modal.salvar();
    expect(itens.criar).not.toHaveBeenCalled();
    expect(modal.ehCredito).toBeFalse();

    preencher({ bancoId: 18 });
    fixture.detectChanges();

    expect(modal.ehCredito).toBeTrue();
    expect(texto()).toContain('Compra parcelada');
  });

  it('parcela atual maior que o total é inválida', () => {
    entradas({ bancoFixoId: 18 });
    preencher({ valor: 10, parcelado: true, quantidadeParcelas: 3, parcelaAtual: 4 });

    modal.salvar();
    fixture.detectChanges();

    expect(itens.criar).not.toHaveBeenCalled();
    expect(texto()).toContain('A parcela atual não pode passar do total.');
  });

  it('cartão parcelado grava todas as parcelas, uma por vez, e fecha avisando que gravou', () => {
    const fechado = jasmine.createSpy('fechado');
    entradas({ bancoFixoId: 18 });
    modal.fechado.subscribe(fechado);
    preencher({ valor: 30, parcelado: true, quantidadeParcelas: 3, parcelaAtual: 1, gerarTodasParcelas: true });

    modal.salvar();

    expect(itens.criar.calls.allArgs().map(([dto]) => dto.numeroFatura)).toEqual(['2026-12', '2027-01', '2027-02']);
    expect(alertas.success).toHaveBeenCalledWith('Parcelamento criado: 3 parcelas.');
    expect(fechado).toHaveBeenCalledOnceWith(true);
  });

  it('erro da API: avisa e mantém o modal aberto', () => {
    const fechado = jasmine.createSpy('fechado');
    itens.criar.and.returnValue(throwError(() => ({ error: { message: 'Falhou' } })));
    entradas({ bancoFixoId: 5 });
    modal.fechado.subscribe(fechado);
    preencher({ valor: 10 });

    modal.salvar();

    expect(alertas.error).toHaveBeenCalledWith('Falhou');
    expect(fechado).not.toHaveBeenCalled();
    expect(modal.salvando).toBeFalse();
  });

  it('cancelar fecha sem gravar', () => {
    const fechado = jasmine.createSpy('fechado');
    entradas({});
    modal.fechado.subscribe(fechado);

    modal.cancelar();

    expect(fechado).toHaveBeenCalledOnceWith(false);
  });
});
