import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';

import { ModalImportarExtratoComponent } from './modal-importar-extrato.component';
import { ExtratoBancarioItemService } from 'src/app/core/services/extrato-bancario-item.service';
import { AlertService } from 'src/app/shared/components/alert.service';
import { BancoDto } from 'src/app/core/models/banco.model';
import { TipoCartaoDto } from 'src/app/core/models/tipo-cartao.model';

/** Importação de extrato do Resumo em formulário Reactive (FE-P2-10). */
describe('ModalImportarExtratoComponent', () => {
  let fixture: ComponentFixture<ModalImportarExtratoComponent>;
  let modal: ModalImportarExtratoComponent;
  let itens: jasmine.SpyObj<ExtratoBancarioItemService>;
  let alertas: jasmine.SpyObj<AlertService>;

  const tiposCartao: TipoCartaoDto[] = [{ id: 2, nomeTipoCartao: 'Conta corrente', ehCredito: false, ehSistema: true }];
  const bancos = [{ id: 5, nomeBanco: 'NuBank', tipoCartaoId: 2 }] as BancoDto[];
  const arquivo = new File(['Data,Valor'], 'NU_2026-12.csv', { type: 'text/csv' });
  const texto = () => (fixture.nativeElement as HTMLElement).textContent ?? '';

  beforeEach(() => {
    itens = jasmine.createSpyObj<ExtratoBancarioItemService>('ExtratoBancarioItemService', ['importar']);
    itens.importar.and.returnValue(of({ quantidadeCriados: 2, mensagem: 'Importação concluída. Criados: 2.' }));
    alertas = jasmine.createSpyObj<AlertService>('AlertService', ['success', 'info', 'error']);
    TestBed.configureTestingModule({
      providers: [
        { provide: ExtratoBancarioItemService, useValue: itens },
        { provide: AlertService, useValue: alertas }
      ]
    });
    fixture = TestBed.createComponent(ModalImportarExtratoComponent);
    modal = fixture.componentInstance;
    fixture.componentRef.setInput('bancos', bancos);
    fixture.componentRef.setInput('tiposCartao', tiposCartao);
    fixture.detectChanges();
  });

  it('sem banco e sem arquivo não importa e mostra os erros nos campos', () => {
    modal.salvar();
    fixture.detectChanges();

    expect(itens.importar).not.toHaveBeenCalled();
    expect(texto()).toContain('Selecione o banco.');
    expect(texto()).toContain('Selecione o arquivo.');
  });

  it('mostra o tipo de conta do banco escolhido', () => {
    modal.form.controls.bancoId.setValue(5);
    fixture.detectChanges();

    expect(modal.tipoCartao?.nomeTipoCartao).toBe('Conta corrente');
  });

  it('importa o arquivo escolhido com o banco e o tipo de conta, avisa e fecha', () => {
    const fechado = jasmine.createSpy('fechado');
    modal.fechado.subscribe(fechado);
    modal.form.controls.bancoId.setValue(5);
    modal.onArquivo({ target: { files: [arquivo] } } as unknown as Event);

    modal.salvar();

    expect(itens.importar).toHaveBeenCalledOnceWith(arquivo, { id: 5, nomeBanco: 'NuBank', tipoCartaoId: 2 });
    expect(alertas.success).toHaveBeenCalledWith('Importação concluída. Criados: 2.');
    expect(fechado).toHaveBeenCalledOnceWith(true);
  });

  it('reimportação sem nada novo avisa como informação', () => {
    itens.importar.and.returnValue(of({ quantidadeCriados: 0, mensagem: 'Nada novo.' }));
    modal.form.controls.bancoId.setValue(5);
    modal.onArquivo({ target: { files: [arquivo] } } as unknown as Event);

    modal.salvar();

    expect(alertas.info).toHaveBeenCalledWith('Nada novo.');
  });

  it('erro da API: avisa e mantém o modal aberto', () => {
    const fechado = jasmine.createSpy('fechado');
    modal.fechado.subscribe(fechado);
    itens.importar.and.returnValue(throwError(() => ({ error: 'Arquivo inválido.' })));
    modal.form.controls.bancoId.setValue(5);
    modal.onArquivo({ target: { files: [arquivo] } } as unknown as Event);

    modal.salvar();

    expect(alertas.error).toHaveBeenCalledWith('Arquivo inválido.');
    expect(fechado).not.toHaveBeenCalled();
    expect(modal.importando).toBeFalse();
  });
});
