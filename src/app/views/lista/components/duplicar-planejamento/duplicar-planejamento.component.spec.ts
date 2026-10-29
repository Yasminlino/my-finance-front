import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { of, throwError } from 'rxjs';

import { DuplicarPlanejamentoComponent } from './duplicar-planejamento.component';
import { ListaService } from 'src/app/core/services/lista.service';
import { AlertService } from 'src/app/shared/components/alert.service';
import { ListaDto } from 'src/app/core/models/lista.model';

/** Duplicar planejamento (card #63): nome do mês seguinte e as opções da API. */
describe('DuplicarPlanejamentoComponent', () => {
  let fixture: ComponentFixture<DuplicarPlanejamentoComponent>;
  let service: jasmine.SpyObj<ListaService>;
  let alerta: jasmine.SpyObj<AlertService>;
  const tela = () => fixture.componentInstance;

  const compras: ListaDto = {
    id: 12, nome: 'Lista de compras · out/2026', usaQuantidade: true, usaValor: true, modoValor: 'UNITARIO', usaLimite: false,
    usaData: false, usaObservacao: false, modelo: 'COMPRAS'
  };

  function montar(lista: ListaDto, hoje = new Date(2026, 9, 29)) {
    fixture = TestBed.createComponent(DuplicarPlanejamentoComponent);
    fixture.componentInstance.hoje = hoje;
    fixture.componentRef.setInput('lista', lista);
    fixture.detectChanges();
  }

  beforeEach(() => {
    service = jasmine.createSpyObj<ListaService>('ListaService', ['duplicar']);
    service.duplicar.and.returnValue(of({ ...compras, id: 40, nome: 'Lista de compras · nov/2026' }));
    alerta = jasmine.createSpyObj<AlertService>('AlertService', ['error']);
    TestBed.configureTestingModule({
      imports: [DuplicarPlanejamentoComponent],
      providers: [provideNoopAnimations(), { provide: ListaService, useValue: service }, { provide: AlertService, useValue: alerta }]
    });
  });

  it('sugere o nome com o mês seguinte e liga as três opções', () => {
    montar(compras);

    expect(tela().form.getRawValue()).toEqual({
      nome: 'Lista de compras · nov/2026', copiarItens: true, manterValores: true, arquivarOriginal: true
    });
  });

  it('duplica com as opções escolhidas e emite a cópia', () => {
    montar(compras);
    const duplicou = jasmine.createSpy('duplicado');
    tela().duplicado.subscribe(duplicou);
    tela().form.patchValue({ nome: '  Compras de novembro ', arquivarOriginal: false });

    tela().duplicar();

    expect(service.duplicar).toHaveBeenCalledWith(12, {
      nome: 'Compras de novembro', copiarItens: true, manterValores: true, arquivarOriginal: false
    });
    expect(duplicou).toHaveBeenCalledWith(jasmine.objectContaining({ id: 40 }));
  });

  it('sem Valor, não oferece "Manter valores"; sem copiar itens, manter valores não vale', () => {
    montar({ ...compras, usaValor: false });
    expect((fixture.nativeElement as HTMLElement).textContent).not.toContain('Manter os valores');

    tela().form.patchValue({ copiarItens: false });
    tela().duplicar();
    expect(service.duplicar).toHaveBeenCalledWith(12, jasmine.objectContaining({ copiarItens: false, manterValores: false }));
  });

  it('nome é obrigatório', () => {
    montar(compras);
    tela().form.patchValue({ nome: ' ' });

    tela().duplicar();

    expect(service.duplicar).not.toHaveBeenCalled();
  });

  it('erro da API avisa e mantém aberto', () => {
    montar(compras);
    const fechou = jasmine.createSpy('fechado');
    tela().fechado.subscribe(fechou);
    service.duplicar.and.returnValue(throwError(() => ({ status: 500 })));

    tela().duplicar();

    expect(alerta.error).toHaveBeenCalled();
    expect(fechou).not.toHaveBeenCalled();
  });
});
