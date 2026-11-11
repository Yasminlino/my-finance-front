import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { FormPanelComponent } from 'src/app/shared/ui/form-panel/form-panel.component';
import { of } from 'rxjs';

import { BancoFormComponent } from './banco-form.component';
import { BancoService } from 'src/app/core/services/banco.service';
import { AlertService } from 'src/app/shared/components/alert.service';
import { PessoaMovimentacaoService } from 'src/app/core/services/pessoa-movimentacao.service';
import { TipoCartaoDto } from 'src/app/core/models/tipo-cartao.model';

/**
 * Saldo inicial com a máscara única (currencyInput): número no formulário, sem parse de texto (FE-P2-10).
 * Formulário no painel lateral (mf-form-panel, card #27) com campos PrimeNG (FE-P2-07).
 */
describe('BancoFormComponent', () => {
  let fixture: ComponentFixture<BancoFormComponent>;
  let service: jasmine.SpyObj<BancoService>;

  const tipos = [{ id: 1, nomeTipoCartao: 'Conta corrente', ehCredito: false }, { id: 2, nomeTipoCartao: 'Cartão de crédito', ehCredito: true }] as TipoCartaoDto[];
  const abrir = (registro: any = null) => {
    fixture = TestBed.createComponent(BancoFormComponent);
    fixture.componentRef.setInput('registro', registro);
    fixture.componentRef.setInput('tiposCartao', tipos);
    fixture.detectChanges();
  };
  const saldo = () => (fixture.nativeElement as HTMLElement).querySelector<HTMLInputElement>('input[formControlName=saldoInicial]')!;

  beforeEach(() => {
    service = jasmine.createSpyObj<BancoService>('BancoService', ['criar', 'atualizar']);
    service.criar.and.returnValue(of({}));
    service.atualizar.and.returnValue(of({}));
    TestBed.configureTestingModule({
      imports: [BancoFormComponent],
      providers: [
        provideNoopAnimations(),
        { provide: BancoService, useValue: service },
        { provide: PessoaMovimentacaoService, useValue: { listar: () => of([
          { id: 20, nomePessoa: 'CARLOS' }, { id: 21, nomePessoa: 'EU', ehTitular: true }
        ]) } },
        { provide: AlertService, useValue: jasmine.createSpyObj('AlertService', ['success', 'error']) }
      ]
    });
  });

  it('na edição mostra o saldo formatado a partir do número', async () => {
    abrir({ id: 5, nomeBanco: 'NuBank', saldoInicial: 1234.56, ativo: true, tipoCartaoId: 2 });
    await fixture.whenStable();

    expect(saldo().value).toBe('1.234,56');
  });

  it('cartão: mostra fechamento e compartilhar; as pessoas cadastradas, sem o Eu', () => {
    abrir({ id: 5, nomeBanco: 'NuBank', saldoInicial: 0, ativo: true, tipoCartaoId: 2, compartilhado: true, pessoasIds: [20] });
    const el = fixture.nativeElement as HTMLElement;

    expect(el.querySelector('#banco-fechamento')).not.toBeNull();
    expect(fixture.componentInstance.opcoesPessoas.map(o => o.label)).toEqual(['CARLOS']);
  });

  it('conta corrente não mostra nada de compartilhar e salva sem pessoas', () => {
    abrir({ id: 6, nomeBanco: 'Caixa', saldoInicial: 0, ativo: true, tipoCartaoId: 1, compartilhado: true, pessoasIds: [20] });
    expect((fixture.nativeElement as HTMLElement).querySelector('#banco-compartilhado')).toBeNull();

    fixture.componentInstance.save();

    expect(service.atualizar).toHaveBeenCalledWith(jasmine.objectContaining({ compartilhado: false, pessoasIds: [], diaFechamento: null }));
  });

  it('compartilhado sem ninguém não salva; editar mantém o convite dispensado', () => {
    abrir({ id: 5, nomeBanco: 'NuBank', saldoInicial: 0, ativo: true, tipoCartaoId: 2, conviteCompartilharDispensado: true });
    fixture.componentInstance.form.patchValue({ compartilhado: true, pessoasIds: [] });
    fixture.componentInstance.save();
    expect(service.atualizar).not.toHaveBeenCalled();

    fixture.componentInstance.form.patchValue({ pessoasIds: [20], diaFechamento: 3 });
    fixture.componentInstance.save();
    expect(service.atualizar).toHaveBeenCalledWith(jasmine.objectContaining({
      compartilhado: true, pessoasIds: [20], diaFechamento: 3, conviteCompartilharDispensado: true
    }));
  });

  it('editar mantém agência e número da conta', () => {
    abrir({ id: 6, nomeBanco: 'Caixa', saldoInicial: 0, ativo: true, tipoCartaoId: 1, agencia: '1234', numeroConta: '5678-9' });
    fixture.componentInstance.save();
    expect(service.atualizar).toHaveBeenCalledWith(jasmine.objectContaining({ agencia: '1234', numeroConta: '5678-9' }));
  });

  it('salva o saldo como número', () => {
    abrir({ id: 5, nomeBanco: 'NuBank', saldoInicial: 10, ativo: true, tipoCartaoId: 2 });
    fixture.componentInstance.form.patchValue({ saldoInicial: 15.5 });

    fixture.componentInstance.save();

    expect(service.atualizar).toHaveBeenCalledWith(jasmine.objectContaining({ saldoInicial: 15.5 }));
  });

  it('abre no painel lateral com o título da operação', () => {
    abrir({ id: 5, nomeBanco: 'NuBank', saldoInicial: 0, ativo: true, tipoCartaoId: 2 });

    const dialogo = fixture.debugElement.query(By.directive(FormPanelComponent));
    expect(dialogo).not.toBeNull();
    expect(dialogo.componentInstance.titulo).toBe('Editar Banco');
  });

  it('fechar pelo X avisa sem recarregar', () => {
    const fechado = jasmine.createSpy('closed');
    abrir();
    fixture.componentInstance.closed.subscribe(fechado);

    fixture.debugElement.query(By.directive(FormPanelComponent)).componentInstance.fechar.emit();

    expect(fechado).toHaveBeenCalledOnceWith(false);
  });

  it('tipo de cartão e status são p-dropdown', () => {
    abrir();

    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('p-dropdown[formControlName=tipoCartaoId]')).not.toBeNull();
    expect(el.querySelector('p-dropdown[formControlName=ativo]')).not.toBeNull();
  });

  it('salvar sem nome marca o campo em vermelho e mostra a mensagem', () => {
    abrir();

    fixture.componentInstance.save();
    fixture.detectChanges();

    const nome = (fixture.nativeElement as HTMLElement).querySelector('input[formControlName=nomeBanco]')!;
    expect(nome.classList).toContain('ng-dirty');
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Informe um nome válido.');
    expect(service.criar).not.toHaveBeenCalled();
  });
});
